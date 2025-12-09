import React, { useState } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import "./ChatGPTPage.css";

export default function ChatGPTPage() {
  const { language, t } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("http://localhost:5000/chatgpt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          message: userMessage.content,
          language: language,
          conversation_history: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get response from ChatGPT");
      }

      const aiMessage = {
        role: "assistant",
        content: data.response || data.message || "No response received",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      console.error("Error sending message:", err);
      setError(err.message || "Failed to send message. Please try again.");
      
      const errorMessage = {
        role: "assistant",
        content: language === "lv" 
          ? "Atvainojiet, radās kļūda. Lūdzu, mēģiniet vēlreiz vai pārbaudiet, vai OPENAI_API_KEY ir iestatīts .env failā."
          : "Sorry, an error occurred. Please try again or check if OPENAI_API_KEY is set in .env file.",
        timestamp: new Date(),
        isError: true,
      };
      
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  return (
    <div className="chatgpt-page">
      <div className="chatgpt-header">
        <h1>{t("chatgpt.title") || "ChatGPT Nutrition Assistant"}</h1>
        <p>{t("chatgpt.subtitle") || "Ask questions about nutrition, recipes, and healthy eating"}</p>
      </div>

      <div className="chatgpt-container">
        <div className="chatgpt-sidebar">
          <div className="sidebar-section">
            <h3>{t("chatgpt.suggestions") || "Suggestions"}</h3>
            <div className="suggestion-chips">
              {language === "lv" ? [
                "Kā sastādīt veselīgu ēdienkarti?",
                "Kādi produkti ir bagāti ar olbaltumvielām?",
                "Kā zaudēt svaru veselīgi?",
                "Kādi ir labākie recepti brokastīm?",
                "Kā uzturēt sabalansētu uzturu?",
              ] : [
                "How to create a healthy meal plan?",
                "What foods are rich in protein?",
                "How to lose weight healthily?",
                "What are the best breakfast recipes?",
                "How to maintain a balanced diet?",
              ].map((suggestion, idx) => (
                <button
                  key={idx}
                  className="suggestion-chip"
                  onClick={() => {
                    setInput(suggestion);
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {messages.length > 0 && (
            <button className="clear-chat-btn" onClick={clearChat}>
              {t("chatgpt.clearChat") || "Clear Chat"}
            </button>
          )}
        </div>

        <div className="chatgpt-main">
          <div className="messages-container">
            {messages.length === 0 ? (
              <div className="welcome-message">
                <div className="welcome-icon"></div>
                <h2>{t("chatgpt.welcome") || "Welcome to ChatGPT Nutrition Assistant!"}</h2>
                <p>
                  {language === "lv"
                    ? "Uzdodiet jebkādus jautājumus par uzturu, receptēm un veselīgu ēšanu. Es palīdzēšu jums ar padomiem un ieteikumiem."
                    : "Ask any questions about nutrition, recipes, and healthy eating. I'll help you with tips and recommendations."}
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`message ${msg.role} ${msg.isError ? "error" : ""}`}
                >
                  <div className={`message-avatar ${msg.role === "user" ? "user-avatar" : "assistant-avatar"}`}>
                    {msg.role === "user" ? "U" : "AI"}
                  </div>
                  <div className="message-content">
                    <div className="message-text">{msg.content}</div>
                    <div className="message-time">
                      {msg.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="message assistant loading">
                <div className="message-avatar assistant-avatar">AI</div>
                <div className="message-content">
                  <div className="loading-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="error-banner">
              {error}
            </div>
          )}

          <div className="input-container">
            <textarea
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                language === "lv"
                  ? "Uzdodiet jautājumu par uzturu..."
                  : "Ask a question about nutrition..."
              }
              rows={3}
              disabled={loading}
            />
            <button
              className="send-button"
              onClick={sendMessage}
              disabled={!input.trim() || loading}
            >
              {loading ? t("chatgpt.sending") || "Sending..." : t("chatgpt.send") || "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
