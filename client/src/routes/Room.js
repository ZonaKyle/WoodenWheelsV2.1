import React, { useRef, useEffect } from "react";
import io from "socket.io-client";

const Room = (props) => {
    const userVideo = useRef();
    const partnerVideo = useRef();
    const peerRef = useRef();
    const socketRef = useRef();
    const otherUser = useRef();
    const userStream = useRef();
    const whichStream = useRef();

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ audio: true, video: true }).then(stream => {
            userVideo.current.srcObject = stream;
            userStream.current = stream;

            socketRef.current = io.connect("/");
            socketRef.current.emit("join room", props.match.params.roomID);

            socketRef.current.on('other user', userID => {
                callUser(userID);
                otherUser.current = userID;
            });

            socketRef.current.on("user joined", userID => {
                otherUser.current = userID;
            });

            socketRef.current.on("offer", handleRecieveCall);

            socketRef.current.on("answer", handleAnswer);

            socketRef.current.on("ice-candidate", handleNewICECandidateMsg);
        });

    }, []);

    function callUser(userID) {
        peerRef.current = createPeer(userID);
        userStream.current.getTracks().forEach(track => peerRef.current.addTrack(track, userStream.current));
    }

    function createPeer(userID) {
        const peer = new RTCPeerConnection({
            iceServers: [{
                urls: [ "stun:ws-turn6-back.xirsys.com" ]
                 }, {
                username: "CA92r4NrNdIugUbHfSpO2R84rQNAHNsw9XqN94QmwYpT9dDN6E8HofN3OTXTX0tiAAAAAF8N0Sl6b25ha3lsZQ==",
                credential: "e3a671ce-c5e7-11ea-8411-d6c6c83d462e",
                urls: [
                    "turn:ws-turn6-back.xirsys.com:80?transport=udp",
                    "turn:ws-turn6-back.xirsys.com:3478?transport=udp",
                    "turn:ws-turn6-back.xirsys.com:80?transport=tcp",
                    "turn:ws-turn6-back.xirsys.com:3478?transport=tcp",
                    "turns:ws-turn6-back.xirsys.com:443?transport=tcp",
                    "turns:ws-turn6-back.xirsys.com:5349?transport=tcp"
                    ]},
            ]
        });

        peer.onicecandidate = handleICECandidateEvent;
        peer.ontrack = handleTrackEvent;
        peer.onnegotiationneeded = () => handleNegotiationNeededEvent(userID);

        return peer;
    }

    function handleNegotiationNeededEvent(userID) {
        peerRef.current.createOffer().then(offer => {
            return peerRef.current.setLocalDescription(offer);
        }).then(() => {
            const payload = {
                target: userID,
                caller: socketRef.current.id,
                sdp: peerRef.current.localDescription
            };
            socketRef.current.emit("offer", payload);
        }).catch(e => console.log(e));
    }

    function handleRecieveCall(incoming) {
        peerRef.current = createPeer();
        const desc = new RTCSessionDescription(incoming.sdp);
        peerRef.current.setRemoteDescription(desc).then(() => {
            userStream.current.getTracks().forEach(track => peerRef.current.addTrack(track, userStream.current));
        }).then(() => {
            return peerRef.current.createAnswer();
        }).then(answer => {
            return peerRef.current.setLocalDescription(answer);
        }).then(() => {
            const payload = {
                target: incoming.caller,
                caller: socketRef.current.id,
                sdp: peerRef.current.localDescription
            }
            socketRef.current.emit("answer", payload);
        })
    }

    function handleAnswer(message) {
        const desc = new RTCSessionDescription(message.sdp);
        peerRef.current.setRemoteDescription(desc).catch(e => console.log(e));
    }

    function handleICECandidateEvent(e) {
        if (e.candidate) {
            const payload = {
                target: otherUser.current,
                candidate: e.candidate,
            }
            socketRef.current.emit("ice-candidate", payload);
        }
    }

    function handleNewICECandidateMsg(incoming) {
        const candidate = new RTCIceCandidate(incoming);

        peerRef.current.addIceCandidate(candidate)
            .catch(e => console.log(e));
    }

    function handleTrackEvent(e) {
        partnerVideo.current.srcObject = e.streams[0];
    };

    function switchStream(){
        if (userVideo.current.srcObject = stream) {
            whichStream=
            <iframe width="560" height="315" src="https://www.youtube.com/embed/BpR1Ds9TsrU" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            //<embed type="video/webm" src="http://localhost:8000"></embed>       
        } else {
            whichStream = userVideo
        };

    }

    return (
        <div>
            <video autoPlay ref={whichStream} />
            <video autoPlay ref={partnerVideo} />

            <button class="app_button" onclick= {
                switchStream() 
            }>WW APP STREAM</button>

        </div>
    );
};

export default Room;