// =============================
// src/App.jsx (React UI) — เพิ่มปุ่ม Start / Stop
// =============================
import React, { useEffect, useRef, useState } from 'react';

export default function App() {
  const [username, setUsername] = useState('telechubbiies');
  const [durationSec, setDurationSec] = useState(60);

  const [isConnected, setIsConnected] = useState(false); // WS connected?
  const [tikTokReady, setTikTokReady] = useState(false); // TikTok connected?

  const [isCounting, setIsCounting] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [remaining, setRemaining] = useState(0);
  const [statusMsg, setStatusMsg] = useState('พร้อมเชื่อมต่อและเริ่มโหวต');

  const votesRef = useRef(new Map());
  const [version, setVersion] = useState(0);
  const [totalMsgs, setTotalMsgs] = useState(0);
  const [lastMsg, setLastMsg] = useState('');

  const wsRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const countTimerRef = useRef(null);

  const isCountingRef = useRef(false)
  useEffect(() => { isCountingRef.current = isCounting; }, [isCounting]);

  function resetVotes() {
    votesRef.current = new Map();
    setVersion(v => v + 1);
  }
  function sortedVotes() { return [...votesRef.current.entries()].sort((a, b) => b[1] - a[1]); }
  function topVote() { const l = sortedVotes(); return l.length ? l[0] : null; }

  function connectWS() {
    if (wsRef.current && wsRef.current.readyState === 1) return;
    const ws = new WebSocket('ws://127.0.0.1:3001');
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setStatusMsg('เชื่อมต่อโหนดสำเร็จ (WS)');
      setTikTokReady(false);
      ws.send(JSON.stringify({ type: 'connect', username }));
    };
    ws.onclose = () => {
      setIsConnected(false);
      setTikTokReady(false);
      setStatusMsg('ตัดการเชื่อมต่อ WS');
    };
    ws.onerror = (e) => {
      setIsConnected(false);
      setTikTokReady(false);
      setStatusMsg('WS error: ' + String(e?.message || 'unknown'));
    };
    ws.onmessage = (ev) => {
      if (ev.data instanceof Blob) {
        ev.data.text().then((t) => { console.log('[WS] raw', t); handleMsg(t); });
      } else {
        handleMsg(ev.data);
      }
    };
  }

  function handleMsg(raw) {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'status') {
        if (msg.status === 'connected') { setTikTokReady(true); setStatusMsg(`เชื่อมต่อ TikTok: @${msg.username} (roomId ${msg.roomId})`); }
        else if (msg.status === 'error') { setTikTokReady(false); setStatusMsg('เชื่อมต่อไม่สำเร็จ: ' + msg.message); }
        else if (msg.status === 'disconnected') { setTikTokReady(false); setStatusMsg('หลุดจาก TikTok'); }
      }
      if (msg.type === 'chat') {
        setTotalMsgs(n => n + 1);
        setLastMsg(`${msg.user || 'unknown'}: ${msg.comment || ''}`);
        if (isCountingRef.current) {
          let key = (msg.comment || '').trim();
          if (!key) return;
          const prev = votesRef.current.get(key) || 0;
          votesRef.current.set(key, prev + 1);
          setVersion(v => v + 1);
        }
      }
    } catch (e) { console.log('[WS] parse error', e, raw); }
  }

  function disconnectWS() {
    try { wsRef.current?.close(); } catch { }
    wsRef.current = null;
    setIsConnected(false);
    setTikTokReady(false);
  }

  async function startPoll() {
    if (!wsRef.current || wsRef.current.readyState !== 1) connectWS();
    try { wsRef.current?.send(JSON.stringify({ type: 'connect', username })); } catch { }

    setStatusMsg('กำลังเตรียมเริ่ม… (รอเชื่อม TikTok)');
    await waitFor(() => tikTokReady, 8000);

    resetVotes();
    setIsStarting(true); setIsCounting(false); setCountdown(3);

    // เคลียร์ตัวนับเดิมถ้ามี
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    countdownTimerRef.current = setInterval(() => {
      setCountdown((c) => {
        const next = c - 1;
        if (next <= 0) {
          clearInterval(countdownTimerRef.current);
          setIsStarting(false);
          beginCounting();
          return 0;
        }
        return next;
      });
    }, 1000);
  }

  function beginCounting() {
    setIsCounting(true);
    isCountingRef.current = true;
    setRemaining(Number(durationSec) || 60);
    setStatusMsg('กำลังนับโหวต…');

    if (countTimerRef.current) clearInterval(countTimerRef.current);
    countTimerRef.current = setInterval(() => {
      setRemaining((r) => {
        const next = r - 1;
        if (next <= 0) {
          clearInterval(countTimerRef.current);
          finishPoll();
          return 0;
        }
        return next;
      });
    }, 1000);
  }

  function stopPoll() {
    // หยุดทั้งช่วงเคานต์ดาวน์และช่วงนับโหวต
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    if (countTimerRef.current) clearInterval(countTimerRef.current);
    setIsStarting(false);
    setIsCounting(false);
    isCountingRef.current = false;
    setStatusMsg('หยุดนับแล้ว');
  }

  function finishPoll() {
    setIsCounting(false);
    const top = topVote();
    if (top) setStatusMsg(`หมดเวลา! คำที่ชนะ: “${top[0]}” ด้วย ${top[1]} โหวต`);
    else setStatusMsg('หมดเวลา! ยังไม่มีโหวต');
  }

  function clearVotes() { resetVotes(); setStatusMsg('ล้างผลโหวตแล้ว'); }

  function waitFor(fn, timeoutMs = 5000, interval = 100) {
    return new Promise((resolve) => {
      const start = Date.now();
      const t = setInterval(() => { if (fn()) { clearInterval(t); resolve(true); } else if (Date.now() - start > timeoutMs) { clearInterval(t); resolve(false); } }, interval);
    });
  }

  function sendTestVote(text) {
    if (!wsRef.current || wsRef.current.readyState !== 1) connectWS();
    try { wsRef.current?.send(JSON.stringify({ type: 'testChat', payload: text || 'ทดสอบ' })); } catch { }
  }

  useEffect(() => () => { stopPoll(); disconnectWS(); }, []);

  const StatusBadge = ({ ok }) => (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
      {ok ? 'Connected' : 'Disconnected'}
    </span>
  );

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 to-white text-slate-800 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold">TikTok Live Vote Counter</h1>
          <StatusBadge ok={isConnected} />
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="flex flex-col md:col-span-2">
            <label className="text-sm mb-1">TikTok Username</label>
            <input className="rounded-xl border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="เช่น officialgeilegisela" />
          </div>
          <div className="flex flex-col">
            <label className="text-sm mb-1">เวลานับโหวต (วินาที)</label>
            <input type="number" min={5} className="rounded-xl border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400" value={durationSec} onChange={(e) => setDurationSec(Number(e.target.value))} placeholder="60" />
          </div>
          <div className="flex gap-2 md:justify-end">
            {!isConnected ? (
              <button className="rounded-2xl px-4 py-2 bg-slate-900 text-white shadow hover:shadow-md active:scale-[.98]" onClick={connectWS}>Connect</button>
            ) : (
              <button className="rounded-2xl px-4 py-2 bg-slate-200 text-slate-800 shadow hover:shadow-md active:scale-[.98]" onClick={disconnectWS}>Disconnect</button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button disabled={isStarting || isCounting} onClick={startPoll} className={`rounded-2xl px-4 py-2 shadow active:scale-[.98] ${isStarting || isCounting ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 text-white'}`}>Start</button>
          <button disabled={!isStarting && !isCounting} onClick={stopPoll} className={`rounded-2xl px-4 py-2 shadow active:scale-[.98] ${!isStarting && !isCounting ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-rose-600 text-white'}`}>Stop</button>
          <button onClick={clearVotes} className="rounded-2xl px-4 py-2 bg-white border border-slate-300 text-slate-700 shadow active:scale-[.98]">Clear</button>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4 bg-white/60 space-y-2">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">สถานะ</p>
              <p className="font-medium">{statusMsg}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">เวลาเหลือ</p>
              <p className="text-2xl font-semibold tabular-nums">{remaining}s</p>
            </div>
          </div>
          <div className="text-xs text-slate-500">debug: messages={totalMsgs} | last="{lastMsg}" | TikTok ready={String(tikTokReady)}</div>
          {/* <div className="flex gap-2 items-center">
            <input id="testvote" className="rounded-xl border border-slate-300 px-3 py-2" placeholder="พิมพ์ข้อความทดสอบ" onKeyDown={(e) => { if (e.key === 'Enter') { sendTestVote(e.currentTarget.value); e.currentTarget.value = ''; } }} />
            <button className="rounded-xl px-3 py-2 bg-slate-100 border" onClick={() => { const el = document.getElementById('testvote'); sendTestVote(el?.value || 'ทดสอบ'); if (el) el.value = ''; }}>ส่ง Test Vote</button>
          </div> */}
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white/60 p-4">
          <h2 className="font-semibold mb-3">ผลโหวต (เรียงจากมากไปน้อย)</h2>
          <VoteTable key={version} rows={sortedVotes()} />
        </section>

        {isStarting && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-3xl px-10 py-8 text-center shadow-xl">
              <p className="text-slate-500 mb-2">เริ่มใน</p>
              <p className="text-6xl font-black tabular-nums leading-none">{countdown}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function VoteTable({ rows }) {
  if (!rows.length) return (<div className="text-slate-500 text-sm">ยังไม่มีโหวตเข้ามา</div>);
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="text-left text-slate-500 text-sm">
            <th className="border-b border-slate-200 py-2 pr-3">อันดับ</th>
            <th className="border-b border-slate-200 py-2 pr-3">คำ/ข้อความ</th>
            <th className="border-b border-slate-200 py-2 pr-3">จำนวนโหวต</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([key, count], idx) => (
            <tr key={key} className={idx === 0 ? 'bg-amber-50/60' : ''}>
              <td className="py-2 pr-3 align-top tabular-nums">{idx + 1}</td>
              <td className="py-2 pr-3 align-top break-all">
                <span className={`inline-block rounded-lg px-2 py-1 ${idx === 0 ? 'bg-amber-100 text-amber-900' : 'bg-slate-100'}`}>{key}</span>
              </td>
              <td className="py-2 pr-3 align-top font-semibold tabular-nums">{count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
