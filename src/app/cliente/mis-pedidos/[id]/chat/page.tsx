import ChatPedido from "@/components/ChatPedido";

export default function ClientePedidoChatPage({ params }: { params: { id: string } }) {
    return (
        <div className="p-5 pb-40">
            <h1 className="text-2xl font-bold mb-4 text-black">Chat con el bar – Pedido #{params.id}</h1>
            <ChatPedido pedidoId={params.id} remitente="cliente" />
        </div>
    );
}
