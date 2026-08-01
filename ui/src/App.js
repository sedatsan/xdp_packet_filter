import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { Shield, ShieldOff, Activity, AlertCircle } from 'lucide-react';

const socket = io('http://localhost:3002');

function App() {
  const [ip, setIp] = useState('');
  const [logs, setLogs] = useState([]);
  const [blockedIps, setBlockedIps] = useState([]);
  const [status, setStatus] = useState('Disconnected');

  useEffect(() => {
    socket.on('connect', () => setStatus('Connected'));
    socket.on('disconnect', () => setStatus('Disconnected'));
    socket.on('response', (data) => {
      addLog(data);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('response');
    };
  }, []);

  const addLog = (msg) => {
    setLogs((prev) => [
      { id: Date.now(), msg, time: new Date().toLocaleTimeString() },
      ...prev,
    ].slice(0, 10));
  };

  const handleBlock = () => {
    if (!ip) return;
    socket.emit('block_ip', ip);
    if (!blockedIps.includes(ip)) {
      setBlockedIps([...blockedIps, ip]);
    }
    setIp('');
  };

  const handleUnblock = (targetIp) => {
    const ipToUnblock = targetIp || ip;
    if (!ipToUnblock) return;
    socket.emit('unblock_ip', ipToUnblock);
    setBlockedIps(blockedIps.filter(item => item !== ipToUnblock));
    if (!targetIp) setIp('');
  };

  return (
    <div style={{
      fontFamily: 'system-ui, sans-serif',
      backgroundColor: '#0f172a',
      color: '#f8fafc',
      minHeight: '100vh',
      padding: '2rem'
    }}>
      <header style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Shield size={32} color="#38bdf8" />
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>XDP Firewall Control</h1>
        <span style={{
          marginLeft: 'auto',
          padding: '0.25rem 0.75rem',
          borderRadius: '9999px',
          fontSize: '0.875rem',
          backgroundColor: status === 'Connected' ? '#065f46' : '#7f1d1d',
          color: status === 'Connected' ? '#34d399' : '#f87171'
        }}>
          {status}
        </span>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Control Panel */}
        <section style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '0.5rem' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={20} /> Control Panel
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <input
              type="text"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="Enter IP (e.g. 192.168.1.10)"
              style={{
                flex: 1,
                padding: '0.5rem',
                borderRadius: '0.25rem',
                border: '1px solid #334155',
                backgroundColor: '#0f172a',
                color: 'white'
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={handleBlock}
              style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: '0.25rem',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <Shield size={18} /> BLOCK
            </button>
            <button
              onClick={() => handleUnblock()}
              style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: '0.25rem',
                backgroundColor: '#059669',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <ShieldOff size={18} /> UNBLOCK
            </button>
          </div>
        </section>

        {/* Logs */}
        <section style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '0.5rem' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={20} /> Action Logs
          </h2>
          <div style={{ height: '200px', overflowY: 'auto', backgroundColor: '#0f172a', padding: '0.5rem', borderRadius: '0.25rem' }}>
            {logs.length === 0 && <div style={{ color: '#64748b', textAlign: 'center', paddingTop: '4rem' }}>No recent actions</div>}
            {logs.map(log => (
              <div key={log.id} style={{ fontSize: '0.875rem', marginBottom: '0.25rem', borderBottom: '1px solid #1e293b', paddingBottom: '0.25rem' }}>
                <span style={{ color: '#94a3b8', marginRight: '0.5rem' }}>[{log.time}]</span>
                <span>{log.msg}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Blocked List */}
        <section style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '0.5rem', gridColumn: 'span 2' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.25rem' }}>Requested Blocks</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {blockedIps.length === 0 && <div style={{ color: '#64748b' }}>No active block requests</div>}
            {blockedIps.map(blockedIp => (
              <div key={blockedIp} style={{
                backgroundColor: '#450a0a',
                border: '1px solid #991b1b',
                padding: '0.25rem 0.75rem',
                borderRadius: '0.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                {blockedIp}
                <button
                  onClick={() => handleUnblock(blockedIp)}
                  style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;
