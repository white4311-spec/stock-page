import { useState, useRef, useEffect } from 'react'
import axios from 'axios'

interface Message { role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = [
  '지금 시장 상황을 간단히 설명해줘',
  '주식 초보자가 알아야 할 기본 개념은?',
  'RSI와 MACD를 어떻게 활용하나요?',
  'VIX가 높을 때 투자 전략은?',
]

export default function ChatPanel() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: '안녕하세요! 주식·금융 관련 질문을 해주세요. Nvidia Nemotron AI가 답변해드립니다. 📈' }])
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, open])

  const send = async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    const newMessages: Message[] = [...messages, { role: 'user', content: msg }]
    setMessages(newMessages); setInput(''); setLoading(true)
    try {
      const history = newMessages.slice(-10).map(m => ({ role: m.role, content: m.content }))
      const { data } = await axios.post('/api/chat', { message: msg, history: history.slice(0, -1) })
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch { setMessages(prev => [...prev, { role: 'assistant', content: '⚠ 응답 오류. 잠시 후 다시 시도해주세요.' }]) }
    finally { setLoading(false) }
  }

  return (
    <>
      <button onClick={() => setOpen(o => !o)} style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000, width: 52, height: 52, borderRadius: '50%', background: open ? 'var(--border2)' : 'var(--accent)', border: 'none', cursor: 'pointer', fontSize: 22, boxShadow: '0 4px 16px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} title="AI 금융 어시스턴트">{open ? '✕' : '🤖'}</button>
      {open && (
        <div style={{ position: 'fixed', bottom: 88, right: 24, zIndex: 999, width: 360, height: 520, background: 'var(--card)', border: '1px solid var(--border2)', borderRadius: 12, display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>🤖</span>
            <div><div style={{ fontWeight: 700, fontSize: 13 }}>AI 금융 어시스턴트</div><div style={{ fontSize: 9, color: 'var(--muted)' }}>Nvidia Nemotron · 투자 정보는 참고용입니다</div></div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.map((m, i) => (<div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}><div style={{ maxWidth: '82%', padding: '8px 11px', borderRadius: 10, fontSize: 12, lineHeight: 1.5, wordBreak: 'break-word', whiteSpace: 'pre-wrap', background: m.role === 'user' ? 'var(--accent)' : 'var(--surface)', color: m.role === 'user' ? '#fff' : 'var(--text)', border: m.role === 'assistant' ? '1px solid var(--border)' : 'none' }}>{m.content}</div></div>))}
            {loading && <div style={{ display: 'flex', justifyContent: 'flex-start' }}><div style={{ padding: '8px 12px', background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)', fontSize: 12, color: 'var(--muted)' }}>⏳ 생각 중...</div></div>}
            <div ref={bottomRef} />
          </div>
          {messages.length === 1 && (<div style={{ padding: '0 12px 6px', display: 'flex', flexWrap: 'wrap', gap: 4 }}>{SUGGESTIONS.map(s => (<button key={s} onClick={() => send(s)} style={{ fontSize: 10, padding: '3px 7px', borderRadius: 12, cursor: 'pointer', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text2)', textAlign: 'left' }}>{s}</button>))}</div>)}
          <div style={{ padding: '8px 10px', borderTop: '1px solid var(--border)', display: 'flex', gap: 6 }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()} placeholder="질문을 입력하세요..." disabled={loading} style={{ flex: 1, padding: '7px 10px', fontSize: 12, background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 6, color: 'var(--text)', outline: 'none' }} />
            <button onClick={() => send()} disabled={loading || !input.trim()} style={{ padding: '0 14px', borderRadius: 6, border: 'none', cursor: 'pointer', background: loading || !input.trim() ? 'var(--border)' : 'var(--accent)', color: '#fff', fontSize: 13 }}>↑</button>
          </div>
        </div>
      )}
    </>
  )
}
