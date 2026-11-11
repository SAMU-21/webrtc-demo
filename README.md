# PoC WebRTC — Compartir Pantalla Remota (WAN)

Prueba de concepto de videollamada unidireccional (solo pantalla) entre dos
dispositivos que **no** están en la misma red, usando WebRTC + servidor de
señalización en Node.js/Socket.io + servidores STUN públicos para NAT traversal.

## Estructura

```
webrtc-screenshare/
├── package.json
├── server.js
└── public/
    ├── emisor.html     # Quien comparte su pantalla
    └── receptor.html   # Quien visualiza el video (PC de demo)
```

## 1. Ejecutar localmente

```bash
npm install
node server.js
```

Abrí en dos pestañas/dispositivos:
- Emisor: `http://localhost:3000/emisor.html`
- Receptor: `http://localhost:3000/receptor.html`

En localhost ambos deben abrirse desde la misma máquina (o misma red) porque
`localhost` no es accesible desde afuera. Para probar entre redes distintas,
necesitás desplegarlo en la nube (paso 2).

## 2. Desplegar en un hosting gratuito (Render)

1. Subí esta carpeta a un repositorio de GitHub.
2. En [render.com](https://render.com), creá un **Web Service** nuevo apuntando a ese repo.
3. Configuración:
   - Build Command: `npm install`
   - Start Command: `node server.js`
4. Render te da una URL pública, por ejemplo `https://tu-poc.onrender.com`.
5. Abrí `https://tu-poc.onrender.com/emisor.html` desde el celular (con datos
   móviles, por ejemplo) y `https://tu-poc.onrender.com/receptor.html` desde
   la PC (con Wi-Fi). No hace falta tocar nada del código: `io()` en el
   frontend se conecta automáticamente al mismo dominio donde se sirvió la página.

(Glitch funciona de forma equivalente: solo subís los 3 archivos y `package.json`.)

## 3. Cómo funciona (para la defensa del profesor)

1. **Señalización**: `server.js` no transmite video. Solo retransmite mensajes
   SDP (oferta/respuesta) y candidatos ICE entre emisor y receptor vía Socket.io,
   para que ambos navegadores negocien una conexión WebRTC.
2. **NAT traversal con STUN**: los servidores STUN públicos de Google
   (`stun.l.google.com:19302`) le dicen a cada navegador cuál es su IP/puerto
   público, permitiendo que ambos peers se encuentren a través de internet
   aunque estén detrás de routers/NAT distintos.
3. **Conexión P2P directa**: una vez negociada, el video viaja directo entre
   los dos dispositivos (no pasa por el servidor), lo cual es más eficiente
   y es la esencia de WebRTC.
4. **Limitación real de STUN**: en redes con NAT simétrico o firewalls
   restrictivos, STUN no alcanza y se necesita un servidor **TURN** (que sí
   reenvía el tráfico). Para la PoC, STUN suele ser suficiente en redes
   domésticas y de datos móviles comunes, pero es un punto válido para
   mencionar como "trabajo futuro" en la defensa (ej. usar un TURN gratuito
   como el de Open Relay Project, o montar `coturn` propio).
5. **Consentimiento explícito**: `getDisplayMedia()` solo puede llamarse tras
   una interacción real del usuario (click en un botón) y el navegador
   siempre muestra su propio selector nativo de pantalla/ventana, más un
   indicador persistente mientras se comparte. Esto es intencional por
   diseño de los navegadores y no se puede desactivar ni ocultar desde
   JavaScript — es justamente la mitigación nativa contra el abuso de esta API.

## 4. Guía rápida de edición de interfaz

En **`emisor.html`** y **`receptor.html`**, todo lo visual está delimitado
entre los comentarios:

```html
/* ============ ZONA DE INTERFAZ (editable) ============ */
...
/* ============ FIN ZONA DE INTERFAZ ============ */
```

Ahí podés cambiar colores, tipografía, textos de los botones (`id="shareBtn"`,
`id="stopBtn"`), el título (`<h1>`) o el layout sin tocar la lógica de WebRTC.

La lógica de conexión está bajo el comentario:

```html
// ============ LÓGICA WEBRTC / SEÑALIZACIÓN (no es interfaz visual) ============
```

No hace falta tocar esa parte salvo que quieras cambiar el comportamiento
(por ejemplo, agregar audio del sistema, cambiar el framerate del video en
`getDisplayMedia({ video: { frameRate: 15 } })`, o agregar un servidor TURN
en `ICE_CONFIG`).

## 5. Variables de entorno (opcional)

`server.js` respeta `process.env.PORT`, que Render/Glitch configuran
automáticamente. No necesitás tocar nada para que funcione en esos hostings.
