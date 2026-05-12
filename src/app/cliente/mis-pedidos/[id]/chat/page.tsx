import ChatPedido from "@/components/ChatPedido";

export default function ClientePedidoChatPage({ params }: { params: { id: string } }) {
    return (
        <div className="h-[100dvh] overflow-hidden">
            <ChatPedido pedidoId={params.id} remitente="cliente" />
        </div>
    );
}
