// =============================
// server.js (รันใน Node.js)
// =============================
// ใช้สำหรับเชื่อมต่อ TikTok LIVE ด้วย tiktok-live-connector (ฝั่งเซิร์ฟเวอร์)
// แล้วกระจายข้อความแชทให้ UI (React) ผ่าน WebSocket
// วิธีใช้:
// 1) สร้างโฟลเดอร์ใหม่ เช่น server
// 2) npm init -y
// 3) npm i tiktok-live-connector ws
// 4) node server.js
// 5) UI จะเชื่อมต่อ ws://localhost:3001


import { WebSocketServer } from "ws";
import { TikTokLiveConnection, WebcastEvent } from "tiktok-live-connector";


const wss = new WebSocketServer({ port: 3001 });
console.log("WS server started on ws://localhost:3001");


let connection = null;
let currentUsername = null;


async function connectToTikTok(username) {
    if (connection) {
        try { await connection.disconnect(); } catch { }
        connection = null;
    }
    currentUsername = username;
    const conn = new TikTokLiveConnection(username);
    connection = conn;
    try {
        const state = await conn.connect();
        console.log("Connected to roomId", state.roomId);


        conn.on(WebcastEvent.CHAT, (data) => {
            const payload = {
                type: "chat",
                user: data?.user?.uniqueId,
                comment: data?.comment,
                ts: Date.now(),
            };
            broadcast(JSON.stringify(payload));
        });


        conn.on(WebcastEvent.GIFT, (data) => {
            const payload = {
                type: "gift",
                user: data?.user?.uniqueId,
                giftId: data?.giftId,
                ts: Date.now(),
            };
            broadcast(JSON.stringify(payload));
        });


        conn.on("disconnected", () => {
            console.log("Disconnected from TikTok");
            broadcast(JSON.stringify({ type: "status", status: "disconnected" }));
        });


        broadcast(JSON.stringify({ type: "status", status: "connected", username, roomId: state.roomId }));
    } catch (err) {
        console.error("Failed to connect:", err);
        broadcast(JSON.stringify({ type: "status", status: "error", message: String(err?.message || err) }));
    }
}


function broadcast(msg) {
    for (const client of wss.clients) {
        if (client.readyState === 1) client.send(msg);
    }
}


wss.on("connection", (ws) => {
    console.log("Client connected");
    ws.send(JSON.stringify({ type: "hello", message: "connected to vote-server" }));


    ws.on("message", async (raw) => {
        try {
            const { type, username } = JSON.parse(raw.toString());
            if (type === "connect" && username) {
                await connectToTikTok(username);
            }
        } catch (e) {
            console.error("Bad message:", e);
        }
    });
});