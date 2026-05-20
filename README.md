# Controle de gastos pessoais (Gastify)
## Sobre o Projeto
O Gastify é uma aplicação web de controle de gastos pessoais desenvolvida com foco em organização financeira, praticidade e facilidade de uso. O sistema foi criado para ajudar usuários a acompanharem suas despesas do dia a dia de maneira simples, rápida e intuitiva, sem necessidade de cadastro complexo ou conexão com banco de dados.

A aplicação permite que o usuário registre seus gastos, organize despesas por categorias personalizadas e acompanhe o valor total gasto em tempo real. Todas as informações são armazenadas localmente no navegador utilizando LocalStorage, garantindo praticidade e funcionamento totalmente offline.

O projeto foi desenvolvido utilizando apenas tecnologias front-end (html, css e javascript) com objetivo acadêmico e educacional, aplicando conceitos fundamentais de desenvolvimento web, manipulação de dados, responsividade e persistência de informações no navegador.

Além disso, o sistema possui uma interface moderna, responsiva e intuitiva, proporcionando uma experiência agradável tanto em computadores quanto em dispositivos móveis.

O Gastify busca demonstrar como aplicações simples podem oferecer soluções úteis para o cotidiano, utilizando recursos leves e acessíveis da web moderna.
## Objetivo
O objetivo do sistema é facilitar o gerenciamento financeiro pessoal sem necessidade de:
- banco de dados
- login
- internet
- instalação de aplicativos
  
Tudo funciona diretamente no navegador.
## Funcionalidades
- Cadastro de categorias
- Registro de gastos
- Listagem de despesas
- Exclusão de gastos
- Cálculo automático do total gasto
- Agrupamento de gastos por categoria
- Persistência de dados utilizando LocalStorage
## Tecnologias
- HTML: Estrutura da aplicação
- CSS:  Estilização da interface
- JavaScript:   Regras de negócio
- LocalStorage: Armazenamento local dos dados
## Requisitos Funcionais (RF)
- RF01: O sistema deve permitir cadastrar usuário (nome simples)
- RF02: O sistema deve permitir cadastrar categorias
- RF03: O sistema deve permitir registrar gastos
- RF04: O sistema deve listar todos os gastos cadastrados
- RF05: O sistema deve agrupar gastos por categoria
- RF06: O sistema deve calcular o total de gastos
- RF07: O sistema deve permitir excluir gastos
## Requisitos Não Funcionais (RNF)
- RNF01: O sistema deve funcionar em navegadores modernos
- RNF02: O sistema deve ser simples e intuitivo
- RNF03: Os dados devem ser armazenados localmente
- RNF05: A interface deve ser responsiva
## Regras de Negócio (RN)
- RN01: Todo gasto deve possuir uma categoria
- RN02: O valor do gasto deve ser maior que zero
- RN03: Uma categoria pode ter vários gastos
- RN04: O usuário pode criar suas próprias categorias
- RN05: Os dados ficam salvos apenas no navegador
## Escopo
- Cadastro de categorias
- Registro de despesas
- Listagem de gastos
- Cálculo de total gasto
- Visualização simples (lista ou gráfico básico)
## Fora do Escopo
- Integração com banco de dados
- Sistema de login com senha
- Armazenamento em nuvem
- Aplicativo mobile
- Controle de receitas
## MVP
- Criar categorias
- Registrar gastos
- Exibir lista de gastos
- Mostrar total gasto
## Estrutura do Projeto
Gastify/
│
├── README.md
├── cypress.config.js
├── index.html
├── script.js
└── style.css
## Armazenamento Local
O sistema utiliza:
- localStorage

Os dados permanecem salvos mesmo após fechar o navegador.

