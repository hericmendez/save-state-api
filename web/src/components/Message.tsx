export type MessageState = { kind: "error" | "ok"; text: string } | null;

export default function Message({ message }: { message: MessageState }) {
  if (!message) return null;
  return (
    <p className={message.kind === "error" ? "text-red-600" : "text-green-600"}>
      {message.text}
    </p>
  );
}
