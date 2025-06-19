import React, { useState } from 'react'
import {
  MainContainer,
  ChatContainer,
  MessageList,
  Message,
  MessageInput,
  TypingIndicator,
} from '@chatscope/chat-ui-kit-react'
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css'
import './ChatPanel.css'

function ChatPanel({ docId, documentName }) {
  const [messages, setMessages] = useState([
    {
      message: `Hi! You're chatting about document: ${documentName}`,
      sender: 'bot',
    },
  ])
  const [isTyping, setIsTyping] = useState(false)

  const handleSend = async (text) => {
    const newMsg = {
      message: text,
      sender: 'user',
    }
    setMessages((prev) => [...prev, newMsg])
    setIsTyping(true)

    try {
      const response = await fetch(
        'https://hd3dbgypdj.execute-api.us-east-1.amazonaws.com/prod/get-answer',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: text,
            docId: docId,
          }),
        }
      )

      const data = await response.json()
      // const data = {
      //   answer: `This is a mock response for your query: "${text}" about document ${docId}.`,
      // }
      setMessages((prev) => [
        ...prev,
        {
          message: data.answer || 'Sorry, I didn’t catch that.',
          sender: 'bot',
        },
      ])
    } catch (err) {
      console.error('❌ Error talking to backend:', err)
      setMessages((prev) => [
        ...prev,
        {
          message: 'Something went wrong. Try again later.',
          sender: 'bot',
        },
      ])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div className='chat-wrapper'>
      <MainContainer>
        <ChatContainer>
          <MessageList
            typingIndicator={
              isTyping ? <TypingIndicator content='Thinking...' /> : null
            }
          >
            {messages.map((msg, idx) => (
              <Message
                key={idx}
                model={{
                  message: msg.message,
                  sentTime: 'now',
                  sender: msg.sender,
                  direction: msg.sender === 'user' ? 'outgoing' : 'incoming',
                }}
              />
            ))}
          </MessageList>
          <MessageInput
            placeholder='Ask something about the PDF...'
            onSend={handleSend}
          />
        </ChatContainer>
      </MainContainer>
    </div>
  )
}

export default ChatPanel
