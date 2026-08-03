const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

let pedidos = [];
let motoboysCadastrados = []; // Banco de dados em memória para os motoboys

const enderecoRestaurante = "Av. Principal, 100 - Centro";
const gerarCodigo = () => Math.floor(1000 + Math.random() * 9000).toString();

function calcularFrete(distanciaKm) {
    const taxaMinima = 5.00;
    if (distanciaKm > 4) {
        return distanciaKm * 1.60;
    } else {
        return taxaMinima;
    }
}

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

// CADASTRO DE MOTOBOY
app.post('/motoboys/cadastrar', (req, res) => {
    const { nome, usuario, senha } = req.body;
    if (!nome || !usuario || !senha) {
        return res.status(400).json({ erro: "Preencha todos os campos." });
    }
    const existe = motoboysCadastrados.find(m => m.usuario === usuario);
    if (existe) {
        return res.status(400).json({ erro: "Este nome de usuário já está em uso." });
    }
    const novoMotoboy = { id: motoboysCadastrados.length + 1, nome, usuario, senha };
    motoboysCadastrados.push(novoMotoboy);
    res.status(201).json({ mensagem: "Cadastro realizado com sucesso!", motoboy: { id: novoMotoboy.id, nome: novoMotoboy.nome, usuario: novoMotoboy.usuario } });
});

// LOGIN DE MOTOBOY
app.post('/motoboys/login', (req, res) => {
    const { usuario, senha } = req.body;
    const motoboy = motoboysCadastrados.find(m => m.usuario === usuario && m.senha === senha);
    if (!motoboy) {
        return res.status(400).json({ erro: "Usuário ou senha inválidos." });
    }
    res.json({ mensagem: "Login bem-sucedido!", motoboy: { id: motoboy.id, nome: motoboy.nome, usuario: motoboy.usuario } });
});

app.get('/restaurante/pedidos', (req, res) => {
    const pedidosRestaurante = pedidos.map(p => ({
        id: p.id,
        cliente: p.cliente,
        status: p.status,
        codigoColetaParaValidar: p.codigoColeta,
        codigoEntregaParaValidar: p.codigoEntrega // Vírgula adicionada corretamente aqui
    }));
    res.json(pedidosRestaurante);
});

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
        motoboyId: null,
        motoboyNome: null,
        codigoColeta: gerarCodigo(),   
        codigoEntrega: gerarCodigo(),  
        data: new Date()
    };
    pedidos.push(novoPedido);
    res.status(201).json({ mensagem: "Pedido criado!", pedido: novoPedido });
});

app.get('/pedidos', (req, res) => {
    res.json(pedidos);
});

app.post('/pedidos/:id/aceitar', (req, res) => {
    const pedidoId = parseInt(req.params.id);
    const { motoboyId, motoboyNome } = req.body;
    const pedido = pedidos.find(p => p.id === pedidoId);

    if (!pedido) return res.status(404).json({ erro: "Pedido não encontrado." });
    if (pedido.status !== "Disponível") return res.status(400).json({ erro: "Este pedido já foi aceito por outro motoboy." });

    pedido.status = "Aguardando Coleta";
    pedido.motoboyId = motoboyId;
    pedido.motoboyNome = motoboyNome;
    res.json({ mensagem: "Entrega aceita com sucesso!", pedido });
});

app.post('/pedidos/:id/recusar', (req, res) => {
    const pedidoId = parseInt(req.params.id);
    const pedido = pedidos.find(p => p.id === pedidoId);
    if (!pedido) return res.status(404).json({ erro: "Pedido não encontrado." });
    
    pedido.status = "Cancelado pelo Motoboy";
    pedido.motoboyId = null;
    pedido.motoboyNome = null;
    res.json({ mensagem: "Entrega recusada.", pedido });
});

app.post('/pedidos/:id/coletar', (req, res) => {
    const pedidoId = parseInt(req.params.id);
    const { codigoColeta } = req.body;
    const pedido = pedidos.find(p => p.id === pedidoId);

    if (!pedido) return res.status(404).json({ erro: "Pedido não encontrado." });
    if (pedido.codigoColeta !== codigoColeta) return res.status(400).json({ erro: "Código de coleta incorreto!" });

    pedido.status = "Em Trânsito";
    res.json({ mensagem: "Coleta realizada!", pedido });
});

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