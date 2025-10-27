import ChatPedido from "@/components/ChatPedido";

export default function AdminPedidoChatPage({ params }: { params: { id: string } }) {
    return (
        <div className="min-h-screen bg-zinc-950 text-white">
            {/* 💬 Chat principal (idéntico al del cliente) */}
            <ChatPedido pedidoId={params.id} remitente="admin" />
        </div>
    );
}
