const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

let pedidos = [];
const enderecoRestaurante = "Av. Principal, 100 - Centro";
const gerarCodigo = () => Math.floor(1000 + Math.random() * 9000).toString();

function calcularFrete(distanciaKm) {
    const valorCalculado = distanciaKm * 1.00;
    const taxaMinima = 7.50;
    return Math.max(valorCalculado, taxaMinima);
}

// 1. Restaurante visualiza os pedidos
app.get('/restaurante/pedidos', (req, res) => {
    const pedidosRestaurante = pedidos.map(p => ({
        id: p.id,
        cliente: p.cliente,
        status: p.status,
        codigoColetaParaValidar: p.codigoColeta
    }));
    res.json(pedidosRestaurante);
});

// Criar o Pedido
app.post('/pedidos', (req, res) => {
    const { cliente, enderecoEntrega, distanciaKm } = req.body;

    if (!cliente || !enderecoEntrega || distanciaKm === undefined) {
        return res.status(400).json({ erro: "Preencha todos os campos." });
    }

    const taxaEntrega = calcularFrete(distanciaKm);

    const novoPedido = {
        id: pedidos.length + 1,
        cliente,
        retirada: { local: "Restaurante Sabor & Arte", endereco: enderecoRestaurante },
        entrega: { enderecoCliente: enderecoEntrega, distanciaKm: distanciaKm },
        financeiro: { taxaEntrega: taxaEntrega.toFixed(2) },
        status: "Disponível",
        motoboyAceito: null,
        codigoColeta: gerarCodigo(),   
        codigoEntrega: gerarCodigo(),  
        data: new Date()
    };

    pedidos.push(novoPedido);
    res.status(201).json({ mensagem: "Pedido criado!", pedido: novoPedido });
});

// Listar pedidos
app.get('/pedidos', (req, res) => {
    res.json(pedidos);
});

// Motoboy ACEITA a entrega
app.post('/pedidos/:id/aceitar', (req, res) => {
    const pedidoId = parseInt(req.params.id);
    const pedido = pedidos.find(p => p.id === pedidoId);

    if (!pedido) return res.status(404).json({ erro: "Pedido não encontrado." });
    if (pedido.status !== "Disponível") return res.status(400).json({ erro: "Este pedido já foi aceito por outro motoboy." });

    pedido.status = "Aguardando Coleta";
    res.json({ mensagem: "Entrega aceita com sucesso! Vá ao restaurante.", pedido });
});

// Motoboy CANCELA / RECUSA a entrega
app.post('/pedidos/:id/recusar', (req, res) => {
    const pedidoId = parseInt(req.params.id);
    const pedido = pedidos.find(p => p.id === pedidoId);

    if (!pedido) return res.status(404).json({ erro: "Pedido não encontrado." });
    
    pedido.status = "Cancelado pelo Motoboy";
    res.json({ mensagem: "Entrega recusada.", pedido });
});

// Coletar no Restaurante
app.post('/pedidos/:id/coletar', (req, res) => {
    const pedidoId = parseInt(req.params.id);
    const { codigoColeta } = req.body;
    const pedido = pedidos.find(p => p.id === pedidoId);

    if (!pedido) return res.status(404).json({ erro: "Pedido não encontrado." });
    if (pedido.codigoColeta !== codigoColeta) return res.status(400).json({ erro: "Código de coleta incorreto!" });

    pedido.status = "Em Trânsito";
    res.json({ mensagem: "Coleta realizada!", pedido });
});

// Concluir Entrega
app.post('/pedidos/:id/entregar', (req, res) => {
    const pedidoId = parseInt(req.params.id);
    const { codigoEntrega } = req.body;
    const pedido = pedidos.find(p => p.id === pedidoId);

    if (!pedido) return res.status(404).json({ erro: "Pedido não encontrado." });
    if (pedido.codigoEntrega !== codigoEntrega) return res.status(400).json({ erro: "Código de entrega incorreto!" });

    pedido.status = "Entregue";
    res.json({ mensagem: "Entrega concluída!", pedido });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT} 🚀`);
});