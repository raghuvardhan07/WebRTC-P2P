const express = require("express")
const http =  require("http")
const socketIO = require("socket.io")
const cors = require('cors');
const app = express()
const server = http.createServer(app)
const { v4: uuidv4 } = require('uuid');


const io = socketIO(server);

app.use(cors())

let idToSocket = new Map()

// The sole high-level function of this signalling server is "message-passing"
io.on("connection", (socket) => {
    const myId = uuidv4()
    idToSocket.set(myId, socket)  // Assign a unique id to this new socket
    socket.emit("message", {msg:{type: "uuid", id: myId}}) // Send client's id to client
    // message : {to: uuidv4, from: uuidv4, message: Object}
    console.log(myId + " connected");
    socket.on("message", (message) => {
        console.log(message.msg.type + " passing to " + message.to);
        const destinationSocket = idToSocket.get(message.to)
        if (destinationSocket === socket) {
            console.log("trying to connect to yourself");
        }
        else {
            io.to(destinationSocket?.id).emit("message", message)
        }
    })

    socket.on("disconnect", () => {
        idToSocket.delete(myId)
        console.log(myId + " disconnected");
    })

})

const PORT = 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})
// Runs this signalling server on PORT 5000