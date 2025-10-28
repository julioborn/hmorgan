import ChatPedido from "@/components/ChatPedido";

export default function AdminPedidoChatPage({ params }: { params: { id: string } }) {
    return (
        <div className="min-h-screen bg-black text-white overflow-hidden">
            <ChatPedido pedidoId={params.id} remitente="admin" />
        </div>
    );
}
