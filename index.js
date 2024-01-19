// socket represents communication channel
const socket = io("http://127.0.0.1:5000")  // Connect to this signalling server
// socket message : {to: uuidv4, from: socket, message: Object}

const localVideo = document.getElementById("localStream");
const remoteVideo = document.getElementById("remoteStream");
const startButton = document.getElementById("startButton");
const hangupButton = document.getElementById("endButton");
const destinationIdElement = document.getElementById("destinationId")
const connectedTo = document.getElementById("connectedTo")
const myIdElement = document.getElementById("myId")
const modal = document.getElementById("modal")
const modalYes = document.getElementById("btnYes")
const modalNo = document.getElementById("btnNo")

let myId;
let destinationId;
// Connection related objects
let localStream;  // local MediaStream
let remoteStream; // remote MediaStream
let peerConnection; // the peer connection channel object

const configuration = {
    iceServers: [
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
};
  

// Accessing our video and audio
navigator.mediaDevices.getUserMedia({audio:true, video: true})
.then((stream) => {
    console.log("MediaStream: ", stream);
    localStream = stream
    localVideo.srcObject = stream
}).catch(err => console.log("Error accessing media devices: ", err))


// Handle start button click to initiate the call
startButton.addEventListener("click", async () => {
    destinationId = destinationIdElement.value
    console.log(destinationId, "attempted to start connection");

    await createPeerConnection();

    const offer = await peerConnection.createOffer();  // Contains caller's sdp

    await peerConnection.setLocalDescription(offer)
    console.log("Offer created and local description updated");
    console.log("offer", offer);
    socket.emit("message", {msg: offer, from: myId, to: destinationId});  // pass message to server
    console.log(offer);
});

// Handle hangup button click to end the call
hangupButton.addEventListener("click", async () => {
    remoteVideo.style.display = "none"
    console.log(myId, "hung up");
    if (peerConnection) {
        await peerConnection.close();
        socket.emit("message", {msg: {type: "end"}, from: myId, to: destinationId})
    }
    remoteVideo.srcObject = null;
    connectedTo.innerHTML = ""
    hangupButton.disabled = true;
});


// Handle incoming signaling messages from the signaling server
socket.on("message", (message) => {
    // Determine the type of the message (offer, answer, or candidate)
    if (message.msg.type === "offer") {
        console.log("offer recieved");
        destinationId = message.from
        handleOffer(message.msg);

    } else if (message.msg.type === "answer") {
        console.log("answer recieved");
        destinationId = message.from
        handleAnswer(message.msg);

    } else if (message.msg.type === "candidate") {
        console.log("ice recieved");
        handleIceCandidate(message.msg);

    } else if (message.msg.type === "end") {
        remoteVideo.style.display = "none"
        connectedTo.innerHTML = ""
        hangupButton.disabled = true

    } else if (message.msg.type === 'uuid') {
        myId = message.msg.id
        myIdElement.innerHTML = myId
    } else if (message.msg.type === 'rejected') {
        alert(`${message.from} rejected you connection`)
    }
});

// Function to create a new RTCPeerConnection
async function createPeerConnection() {
    if (!peerConnection) {
        peerConnection = new RTCPeerConnection(configuration);

        // Handle ice candidate events
        peerConnection.onicecandidate = handleIceCandidateEvent;

        // Handle remote stream added events
        peerConnection.ontrack = handleTrackEvent;

        // Add local tracks to the peer connection
        await localStream.getTracks().forEach(async (track) => await peerConnection.addTrack(track, localStream));

    }
}

// Function to handle incoming offer messages
async function handleOffer(offer) {
    modal.style.display = "block"

    btnYes.addEventListener("click", async () => {
        // Create a new peer connection
        console.log("handling offer");

        await createPeerConnection();
        // Set the remote description to the received offer
        await peerConnection.setRemoteDescription(offer);
            
        // Create an answer to the offer
        const answer = await peerConnection.createAnswer()
        await peerConnection.setLocalDescription(answer)
        console.log("Offer created and local description updated");

        socket.emit("message", {msg: answer, from: myId, to: destinationId});
        console.log(answer);
        connectedTo.innerHTML = destinationId
        hangupButton.disabled = false
        modal.style.display = "none"
    })

    btnNo.addEventListener("click", async () => {
        socket.emit("message", {msg:{type:"rejected"}, from: myId, to: destinationId})
        modal.style.display = "none";
    })
    
}

// Function to handle incoming answer messages
async function handleAnswer(answer) {
    // Set the remote description to the received answer
    console.log("handling answer");
    await peerConnection.setRemoteDescription(answer);
    connectedTo.innerHTML = destinationId
    hangupButton.disabled = false;
    destinationIdElement.value = ""

}

// Function to handle incoming ICE candidate messages
async function handleIceCandidate(candidate) {
    // Add the ICE candidate to the peer connection
    console.log("handling ice incoming", candidate);
    await peerConnection.addIceCandidate(candidate.candidate);
}

// Function to handle local ICE candidate events
function handleIceCandidateEvent(event) {
    console.log("handling ice sending");
    if (event.candidate) {
        console.log("candidate", event.candidate);
        // Send the ICE candidate to the other peer
        socket.emit("message", {msg: { type: "candidate", candidate: event.candidate }, from: myId, to: destinationId});
    }
}


// Function to handle remote track added events
function handleTrackEvent(event) {
    remoteVideo.style.display = "block"
    console.log("handling track event");
    console.log(event);
    remoteStream = event.streams[0]
    remoteVideo.srcObject = remoteStream;
    console.log("remote video addded");
}

