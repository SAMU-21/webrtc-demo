// server.js
// Servidor de señalización para la PoC de WebRTC (compartir pantalla remota).
// Este servidor NO transporta video/audio: solo intercambia los mensajes
// necesarios (ofertas SDP, respuestas SDP y candidatos ICE) para que
// emisor y receptor negocien una conexión WebRTC DIRECTA entre ellos.

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);

// Socket.io con CORS abierto: útil para la PoC donde emisor y receptor
// pueden estar en orígenes/redes distintas. En producción real conviene
// restringir "origin" al dominio donde se aloja la app.
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Servimos los archivos estáticos (emisor.html, receptor.html) desde /public
app.use(express.static(path.join(__dirname, "public")));

// --- Manejo de "salas" muy simple ---
// Usamos un único room fijo ("poc-room") para simplificar la demo:
// el primer dispositivo que entra es el receptor, el segundo el emisor.
// Si quisieras varias demos simultáneas, podrías generar rooms dinámicos
// (por ejemplo, vía un código que se escribe en pantalla).
const ROOM = "poc-room";

io.on("connection", (socket) => {
  console.log(`[+] Cliente conectado: ${socket.id}`);

  // Cualquier cliente (emisor o receptor) se une a la sala al cargar la página
  socket.on("join", (role) => {
    socket.join(ROOM);
    socket.data.role = role; // "emisor" o "receptor"
    console.log(`[room] ${socket.id} se unió como "${role}"`);

    // Avisamos a los demás en la sala que llegó un nuevo participante,
    // junto con su rol, para que sepan si deben iniciar la oferta WebRTC.
    socket.to(ROOM).emit("peer-joined", { id: socket.id, role });
  });

  // --- Intercambio de señalización WebRTC ---
  // Estos tres eventos simplemente retransmiten el mensaje al otro peer
  // de la sala. El contenido (SDP / ICE candidate) lo genera el navegador,
  // el servidor no necesita entenderlo, solo reenviarlo.

  socket.on("webrtc-offer", (data) => {
    socket.to(ROOM).emit("webrtc-offer", { from: socket.id, sdp: data.sdp });
  });

  socket.on("webrtc-answer", (data) => {
    socket.to(ROOM).emit("webrtc-answer", { from: socket.id, sdp: data.sdp });
  });

  socket.on("webrtc-ice-candidate", (data) => {
    socket
      .to(ROOM)
      .emit("webrtc-ice-candidate", { from: socket.id, candidate: data.candidate });
  });

  // Avisar cuando el emisor corta la transmisión (opcional, para UI del receptor)
  socket.on("stop-sharing", () => {
    socket.to(ROOM).emit("stop-sharing");
  });

  socket.on("disconnect", () => {
    console.log(`[-] Cliente desconectado: ${socket.id}`);
    socket.to(ROOM).emit("peer-left", { id: socket.id });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor de señalización escuchando en el puerto ${PORT}`);
  console.log(`Local:     http://localhost:${PORT}`);
  console.log(`Emisor:    http://localhost:${PORT}/emisor.html`);
  console.log(`Receptor:  http://localhost:${PORT}/receptor.html`);
});
