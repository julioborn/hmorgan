import ChatPedido from "@/components/ChatPedido";

export default function AdminPedidoChatPage({ params }: { params: { id: string } }) {
    return (
        <div className="p-5 pb-40">
            <h1 className="text-2xl font-bold mb-4 text-black">Chat del pedido #{params.id}</h1>
            <ChatPedido pedidoId={params.id} remitente="admin" />
        </div>
    );
}
