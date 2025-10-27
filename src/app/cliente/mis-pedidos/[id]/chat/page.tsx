import ChatPedido from "@/components/ChatPedido";

export default function ClientePedidoChatPage({ params }: { params: { id: string } }) {
    return (
        <div className="min-h-screen bg-zinc-950 text-white">
            {/* 💬 Chat principal */}
            <ChatPedido pedidoId={params.id} remitente="cliente" />
        </div>
    );
}
