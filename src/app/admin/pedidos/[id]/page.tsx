import ChatPedido from "@/components/ChatPedido";

export default function PedidoAdminPage({ params }: { params: { id: string } }) {
    return (
        <div className="p-5 pb-40">
            <h1 className="text-2xl font-bold mb-4 text-black">Pedido #{params.id}</h1>
            {/* Aquí podés tener botones para cambiar estado, etc. */}
            <ChatPedido pedidoId={params.id} remitente="admin" />
        </div>
    );
}
