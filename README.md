# Balcão da Batata & Açaí — Sistema de Controle de Vendas

Sistema de controle de vendas para comércio de batata frita e açaí, com
login por usuário e senha, carrinho para selecionar vários produtos ao
mesmo tempo, registro por forma de pagamento (Pix, Cartão, Dinheiro,
Fiado) e totais automáticos por dia, por forma de pagamento e por produto.

## Estrutura de pastas

```
balcao-da-batata/
├── index.html         → estrutura da página (HTML)
├── css/
│   └── style.css       → toda a estilização visual
├── js/
│   └── script.js        → lógica do sistema (login, carrinho, vendas, totais)
└── README.md
```

## Como abrir no VS Code

1. Extraia esta pasta em qualquer lugar do seu computador.
2. Abra a pasta `balcao-da-batata` no VS Code (`Arquivo > Abrir Pasta...`).
3. Instale a extensão **Live Server** (de Ritwick Dey), se ainda não tiver.
4. Clique com o botão direito em `index.html` e escolha **"Open with Live Server"**.
   - Isso abre o site no navegador em um endereço tipo `http://127.0.0.1:5500`.
   - Abrir o `index.html` direto (clique duplo, sem servidor) também funciona.

## Como usar o sistema

1. **Primeiro acesso**: crie um usuário e senha.
2. **Escolha os produtos**: toque em quantos produtos quiser — cada toque
   adiciona ao carrinho e mostra a quantidade no próprio produto.
3. **Carrinho**: ajuste as quantidades com `-`/`+`, remova itens se precisar,
   e veja o total da venda.
4. **Forma de pagamento**: toque em Pix, Cartão, Dinheiro ou Fiado para
   fechar a venda — todos os itens do carrinho são registrados de uma vez.
5. Acompanhe os **totais do dia** por forma de pagamento e por produto, e
   veja o histórico de vendas na seção "Vendas do dia" (com opção de apagar
   uma venda inteira).
6. Use o botão **"Editar preços"** para ajustar os valores dos produtos
   quando quiser.

## Armazenamento dos dados

Os dados (usuário/senha, preços dos produtos e histórico de vendas) ficam
salvos no **localStorage do navegador** — ou seja, no próprio computador
onde o site é acessado. Isso significa que:

- Os dados **não são compartilhados** entre computadores diferentes.
- Se limpar o cache/dados do navegador, o histórico de vendas se perde.
- Não é necessário internet nem servidor externo para usar o sistema
  (apenas para carregar as fontes do Google Fonts na primeira vez).

Se no futuro você quiser acessar os dados de qualquer computador ou celular
ao mesmo tempo (ex: mais de uma pessoa lançando vendas), é necessário
evoluir o projeto para usar um banco de dados na nuvem — posso ajudar com
isso quando quiser.

## Como colocar no ar (publicar na internet)

Como é um site estático (HTML, CSS e JS puros, sem servidor/back-end), dá para
publicar de graça em poucos minutos. Algumas opções simples:

**Netlify (o mais simples)**
1. Acesse [app.netlify.com/drop](https://app.netlify.com/drop).
2. Arraste a pasta `balcao-da-batata` inteira para a página.
3. Pronto — o Netlify gera um link público (tipo `nome-aleatorio.netlify.app`)
   na hora. Depois dá para criar conta grátis e personalizar o endereço.

**Vercel**
1. Crie uma conta em [vercel.com](https://vercel.com).
2. Use a opção de importar uma pasta/projeto e faça o upload da pasta
   `balcao-da-batata`.
3. O Vercel publica automaticamente e fornece um link público.

**GitHub Pages**
1. Crie um repositório no GitHub e envie os arquivos desta pasta para ele.
2. Vá em `Settings > Pages` do repositório e ative o GitHub Pages apontando
   para a branch principal.
3. O GitHub gera um link público (tipo `seuusuario.github.io/repositorio`).

Qualquer uma dessas opções é gratuita e não exige conhecimento técnico além
de arrastar a pasta ou fazer o upload dos arquivos.

**Atenção:** como os dados (login, preços, vendas) ficam salvos no
`localStorage` do navegador, cada pessoa que acessar o site pelo link terá
seu próprio conjunto de dados isolado — não é um banco de dados
compartilhado entre computadores/celulares diferentes. Isso é importante se
você planeja acessar o mesmo histórico de vendas de aparelhos diferentes;
nesse caso, me avise para evoluirmos o sistema com um banco de dados online.



Não existe recuperação automática de senha. Na tela de login, use o link
"Esqueci minha senha / trocar usuário" — isso apaga apenas o login (as
vendas continuam salvas) e permite criar um novo acesso.
