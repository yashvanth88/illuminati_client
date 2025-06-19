import React, { useState, useEffect } from 'react';
import './App.css';
import Chat from './component/Chat';
import VideoChat from './component/VideoChat';

function App() {
  const [ws, setWs] = useState(null);
  const [role, setRole] = useState(null); // 'host' or 'joiner'
  const [passcode, setPasscode] = useState('');
  const [inputPasscode, setInputPasscode] = useState('');
  const [roomReady, setRoomReady] = useState(false);
  const [mode, setMode] = useState('text');
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [error, setError] = useState('');
  const [sessionDuration, setSessionDuration] = useState(300); // default 5 min
  const [isMatching, setIsMatching] = useState(false);
  const [matchStatus, setMatchStatus] = useState('');
  const [matchedRoomId, setMatchedRoomId] = useState('');

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || "wss://34.47.142.176:3001";
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const reconnectDelay = 3000;
    let reconnectTimeout = null;

    function connect() {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      const websocket = new WebSocket(wsUrl);
      websocket.onopen = () => {
        setWs(websocket);
        setConnectionStatus('connected');
        reconnectAttempts = 0;
      };
      websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'room_created') {
            setPasscode(message.passcode);
            setRole('host');
            setRoomReady(false);
            setError('');
            setIsMatching(false);
            setMatchStatus('');
          } else if (message.type === 'join_room_result') {
            if (message.success) {
              setRole('joiner');
              setPasscode(inputPasscode);
              setRoomReady(true);
              setError('');
              setIsMatching(false);
              setMatchStatus('');
            } else {
              setError(message.error || 'Failed to join room');
            }
          } else if (message.type === 'joiner_joined') {
            setRoomReady(true);
          } else if (message.type === 'waiting_for_match') {
            setIsMatching(true);
            setMatchStatus('Waiting for a peer to match...');
          } else if (message.type === 'match_found') {
            setIsMatching(false);
            setMatchStatus('');
            setMatchedRoomId(message.roomId);
            setRole(message.role); // 'host' or 'joiner'
            setRoomReady(true);
            setPasscode(''); // No passcode for matchmaking
          } else if (message.type === 'error') {
            setError(message.message);
            setIsMatching(false);
            setMatchStatus('');
          }
        } catch (error) {
          setError('Error parsing server message');
        }
      };
      websocket.onclose = (event) => {
        setWs(null);
        setConnectionStatus('disconnected');
        setRole(null);
        setPasscode('');
        setRoomReady(false);
        setError('');
        if (event.code === 1000 || reconnectAttempts >= maxReconnectAttempts) {
          return;
        }
        reconnectAttempts++;
        const delay = reconnectDelay * Math.pow(2, reconnectAttempts - 1);
        reconnectTimeout = setTimeout(connect, delay);
      };
      websocket.onerror = () => {
        setConnectionStatus('error');
      };
      return websocket;
    }
    const websocket = connect();
    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.close(1000, 'Component unmounting');
      }
    };
  }, [inputPasscode]);

  const handleCreateRoom = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'create_room', duration: sessionDuration }));
    }
  };

  const handleJoinRoom = () => {
    if (ws && ws.readyState === WebSocket.OPEN && inputPasscode.trim()) {
      ws.send(JSON.stringify({ type: 'join_room', passcode: inputPasscode.trim().toUpperCase() }));
    }
  };

  const handleFindMatch = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      setIsMatching(true);
      setMatchStatus('Requesting match...');
      ws.send(JSON.stringify({ type: 'find_match' }));
    }
  };

  return (
    <div className="app">
      <header>
        <h1>Anonymous Secure Chat</h1>
        <div className="connection-status">
          Status: <span className={connectionStatus}>{connectionStatus}</span>
        </div>
        <div className="mode-selector">
          <button
            onClick={() => setMode('text')}
            className={mode === 'text' ? 'active' : ''}
          >
            Text Chat
          </button>
          <button
            onClick={() => setMode('video')}
            className={mode === 'video' ? 'active' : ''}
          >
            Video Chat
          </button>
        </div>
      </header>
      <div className="security-notice" style={{textAlign: 'center', margin: '10px 0', color: '#16a085', fontWeight: 'bold'}}>
        No metadata is saved. All communication is end-to-end encrypted.
      </div>
      {error && <div className="error-message">{error}</div>}
      {!role && (
        <div className="room-actions">
          <div style={{marginBottom:'1em'}}>
            <label>Session Duration (seconds): </label>
            <input type="number" min="60" max="3600" value={sessionDuration} onChange={e => setSessionDuration(Number(e.target.value))} style={{width:'6em',marginRight:'1em'}} />
          </div>
          <button onClick={handleCreateRoom} disabled={!ws || connectionStatus !== 'connected' || isMatching}>
            Create Room (Host)
          </button>
          <div style={{ margin: '10px 0' }}>OR</div>
          <input
            type="text"
            value={inputPasscode}
            onChange={e => setInputPasscode(e.target.value.toUpperCase())}
            placeholder="Enter Passcode to Join"
            maxLength={6}
            style={{ textTransform: 'uppercase' }}
            disabled={!ws || connectionStatus !== 'connected' || isMatching}
          />
          <button onClick={handleJoinRoom} disabled={!ws || !inputPasscode.trim() || connectionStatus !== 'connected' || isMatching}>
            Join Room
          </button>
          <div style={{ margin: '10px 0' }}>OR</div>
          <button onClick={handleFindMatch} disabled={!ws || connectionStatus !== 'connected' || isMatching}>
            {isMatching ? 'Matching...' : 'Find Match (Auto)'}
          </button>
          {isMatching && <div style={{marginTop:'1em', color:'#16a085', fontWeight:'bold'}}>{matchStatus}</div>}
        </div>
      )}
      {role === 'host' && (
        <div className="room-info">
          <p><strong>Room Passcode:</strong> <span style={{ fontSize: '1.5em', letterSpacing: '0.2em' }}>{passcode}</span></p>
          <p>Share this passcode with your peer to join the room.</p>
          {!roomReady && <p>Waiting for joiner...</p>}
        </div>
      )}
      {role === 'joiner' && !roomReady && (
        <div className="room-info">
          <p>Joining room with passcode <strong>{passcode}</strong>...</p>
        </div>
      )}
      {roomReady && (
        <main>
          {mode === 'text' ? (
            <Chat ws={ws} role={role} />
          ) : (
            <VideoChat ws={ws} role={role} />
          )}
        </main>
      )}
    </div>
  );
}

export default App;