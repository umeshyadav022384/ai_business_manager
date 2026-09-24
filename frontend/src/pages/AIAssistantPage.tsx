import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Sparkles, Send, Bot, User } from "lucide-react";
import { askAssistant } from "../api/aiAssistant";
import type { ChatMessagePayload } from "../api/aiAssistant";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";

interface DisplayMessage extends ChatMessagePayload {
  id: number;
}

const EXAMPLE_QUESTIONS = [
  "What were my total sales this month?",
  "Which products are selling the most?",
  "Which products are low in stock?",
  "How much money do customers owe me?",
  "How much do I owe suppliers?",
  "What was my profit last month?",
  "Which expenses were highest?",
  "Show me my recent sales.",
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  async function sendQuestion(question: string) {
    if (!question.trim() || isSending) return;

    const userMessage: DisplayMessage = { id: Date.now(), role: "user", content: question };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setError(null);
    setIsSending(true);

    try {
      const history: ChatMessagePayload[] = messages.map(({ role, content }) => ({ role, content }));
      const response = await askAssistant(question, history);
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: "assistant", content: response.answer },
      ]);
    } catch {
      setError("Could not reach the AI Assistant. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    sendQuestion(input);
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col space-y-4">
      <PageHeader
        title="AI Assistant"
        description="Ask questions about your sales, inventory, customers, and finances."
      />

      <Card className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <Sparkles className="h-6 w-6" />
              </span>
              <div>
                <p className="text-sm font-medium text-ink-700">Ask me anything about your business</p>
                <p className="mt-1 text-xs text-ink-400">Try one of these to get started:</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {EXAMPLE_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendQuestion(q)}
                    className="rounded-full border border-ink-200 px-3 py-1.5 text-xs text-ink-600 hover:bg-ink-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  message.role === "user" ? "bg-ink-100 text-ink-600" : "bg-brand-50 text-brand-600"
                }`}
              >
                {message.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </span>
              <div
                className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm ${
                  message.role === "user"
                    ? "bg-brand-600 text-white"
                    : "bg-ink-50 text-ink-800"
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}

          {isSending && (
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <Bot className="h-4 w-4" />
              </span>
              <div className="rounded-xl bg-ink-50 px-4 py-2.5 text-sm text-ink-400">Thinking...</div>
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700">{error}</p>
          )}

          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-ink-100 p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your sales, stock, customers, or finances..."
            className="h-10 flex-1 rounded-lg border border-ink-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            disabled={isSending}
          />
          <Button type="submit" isLoading={isSending} leftIcon={<Send className="h-4 w-4" />}>
            Send
          </Button>
        </form>
      </Card>
    </div>
  );
}