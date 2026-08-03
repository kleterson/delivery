const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Servir arquivos estáticos da raiz
app.use(express.static(__dirname));

let pedidos = [];
const enderecoRestaurante = "Av. Principal, 100 - Centro";
const gerarCodigo = () => Math.floor(1000 + Math.random() * 9000).toString();

// NOVA REGRA DE FRETE
function calcularFrete(distanciaKm) {
    const taxaMinima = 5.00;
    
    // Se a distância for maior que 4 km, calcula R$ 1,60 por km. Caso contrário, aplica o mínimo de R$ 5,00.
    if (distanciaKm > 4) {
        const valorCalculado = distanciaKm * 1.60;
        return valorCalculado;
    } else {
        return taxaMinima;
    }
}

// Rota raiz para exibir as opções de acesso
app.get('/', (req, res) => {
    res.send(`
        <div style="font-family: Arial; text-align: center; margin-top: 50px; background: #121212; color: #fff; padding: 40px; border-radius: 10px; max-width: 400px; margin-left: auto; margin-right: auto;">
            <h1>🍔 Sistema de Entregas</h1>
            <p>Escolha qual painel deseja acessar:</p>
            <br>
            <a href="/admin.html" style="display: block; background: #ff5252; color: white; padding: 15px; text-decoration: none; border-radius: 6px; margin-bottom: 10px; font-weight: bold;">Painel do Restaurante (Admin)</a>
            <a href="/index.html" style="display: block; background: #4CAF50; color: white; padding: 15px; text-decoration: none; border-radius: 6px; font-weight: bold;">App do Motoboy</a>
        </div>
    `);
});

// Restaurante visualiza os pedidos
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

    const taxaEntrega = calcularFrete(parseFloat(distanciaKm));

    const novoPedido = {
        id: pedidos.length + 1,
        cliente,
        retirada: { local: "Restaurante Sabor & Arte", endereco: enderecoRestaurante },
        entrega: { enderecoCliente: enderecoEntrega, distanciaKm: parseFloat(distanciaKm) },
        financeiro: { taxaEntrega: parseFloat(taxaEntrega.toFixed(2)) },
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