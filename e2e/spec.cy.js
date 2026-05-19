const DEFAULT_MONTHLY_INCOME = '8000'

const visitApp = () => {
  cy.visit('http://127.0.0.1:5500/', {
    onBeforeLoad(win) {
      win.localStorage.clear()
      win.localStorage.setItem('gastify-monthly-income-v1', DEFAULT_MONTHLY_INCOME)
    },
  })
}

const seedPdfScenario = () => {
  visitApp()
  cy.get('.expense-card:not(.add-card)').should('have.length', 3)
  deleteAllTables()
  createTables(['Casa', 'Necessidades', 'Lazer', 'Saúde'])
  populateTables([
    {
      title: 'Casa',
      rows: [
        { item: 'Aluguel', qty: 1, price: 250000 },
        { item: 'Luz', qty: 1, price: 18000 },
        { item: 'Internet', qty: 1, price: 12000 },
        { item: 'Água', qty: 1, price: 8500 },
        { item: 'Taxa de Condomio', qty: 1, price: 32000 },
        { item: 'Manutenção', qty: 1, price: 15000 },
      ],
    },
    {
      title: 'Necessidades',
      rows: [
        { item: 'Alimentação', qty: 1, price: 90000 },
        { item: 'Fármacia', qty: 1, price: 4500 },
        { item: 'Transporte', qty: 1, price: 15000 },
      ],
    },
    {
      title: 'Lazer',
      rows: [
        { item: 'Streaming', qty: 1, price: 2999 },
        { item: 'Cinema', qty: 2, price: 6000 },
        { item: 'Restaurantes', qty: 2, price: 12000 },
      ],
    },
    {
      title: 'Saúde',
      rows: [
        { item: 'Consulta', qty: 1, price: 15000 },
        { item: 'Remédios', qty: 1, price: 4500 },
        { item: 'Exames', qty: 1, price: 28000 },
      ],
    },
  ])
}

const preparePdfSpies = () => {
  const state = {
    openStub: null,
    createObjectUrlStub: null,
    createElementStub: null,
    anchorClickStub: null,
  }

  cy.window().then((win) => {
    state.openStub = Cypress.sinon.stub(win, 'open')
    state.createObjectUrlStub = Cypress.sinon.stub(win.URL, 'createObjectURL').returns('blob:fake-pdf-url')
    state.createElementStub = Cypress.sinon.stub(win.document, 'createElement').callThrough()
    state.anchorClickStub = Cypress.sinon.stub(win.HTMLAnchorElement.prototype, 'click')
  })

  return state
}

const deleteAllTables = () => {
  cy.get('body').then(($body) => {
    const $buttons = $body.find('button[aria-label="Excluir tabela"]')

    if (!$buttons.length) {
      return
    }

    cy.wrap($buttons.first()).click()
    deleteAllTables()
  })
}

const fillTable = (title, rows) => {
  cy.get('input.new-table-input').clear().type(title)
  cy.get('[aria-label="Criar tabela"]').click()

  cy.get('.expense-card:not(.add-card)').last().as('currentCard')
  cy.get('@currentCard').find('input[aria-label="Nome da tabela"]').should('have.value', title)

  rows.forEach((row, index) => {
    if (index > 0) {
      cy.get('@currentCard').find('button[aria-label="Adicionar linha"]').click()
    }

    cy.get('@currentCard').find('tbody tr').eq(index).within(() => {
      cy.get('input[data-item-id]').clear().type(row.item)
      cy.get('input[data-field="qty"]').clear().type(String(row.qty))
      cy.get('input[data-field="price"]').clear().type(String(row.price))
    })
  })
}

const createTables = (titles) => {
  titles.forEach((title) => {
    cy.get('input.new-table-input').clear().type(title)
    cy.get('[aria-label="Criar tabela"]').click()
  })
}

const populateTables = (tableDefinitions) => {
  tableDefinitions.forEach((tableDefinition, tableIndex) => {
    cy.get('.expense-card:not(.add-card)').eq(tableIndex).within(() => {
      cy.get('input[aria-label="Nome da tabela"]').should('have.value', tableDefinition.title)

      tableDefinition.rows.forEach((row, rowIndex) => {
        if (rowIndex > 0) {
          cy.get('button[aria-label="Adicionar linha"]').click()
        }

        cy.get('tbody tr').eq(rowIndex).within(() => {
          cy.get('input[data-item-id]').clear().type(row.item)
          cy.get('input[data-field="qty"]').clear().type(String(row.qty))
          cy.get('input[data-field="price"]').clear().type(String(row.price))
        })
      })
    })
  })
}

describe('Testes', () => {
  it('Abre a página e renderiza', () => {
    visitApp()
    cy.get('body').should('be.visible')
  })

  it('Permite cadastrar renda mensal', () => {
    visitApp()

    cy.get('input[aria-label="Renda mensal"]')
      .invoke('val')
        .should('match', /8\.000,00$/)
  })

  it('Permite excluir tabelas', () => {
    visitApp()
    cy.get('.expense-card:not(.add-card)').should('have.length', 3)
    deleteAllTables()

    cy.get('button[aria-label="Excluir tabela"]').should('not.exist')
    cy.get('.expense-card:not(.add-card)').should('have.length', 0)
  })

  it('Permite criar novas tabelas', () => {
    visitApp()
    cy.get('.expense-card:not(.add-card)').should('have.length', 3)
    deleteAllTables()

    createTables(['Casa', 'Necessidades', 'Lazer', 'Saúde'])

    cy.get('.expense-card:not(.add-card)').should('have.length', 4)

    cy.get('input[aria-label="Nome da tabela"]').then(($inputs) => {
      const titles = [...$inputs].map((input) => input.value)
      expect(titles).to.deep.equal(['Casa', 'Necessidades', 'Lazer', 'Saúde'])
    })
  })

  it('Permite preencher novas tabelas', () => {
    visitApp()
    cy.get('.expense-card:not(.add-card)').should('have.length', 3)
    deleteAllTables()

    createTables(['Casa', 'Necessidades', 'Lazer', 'Saúde'])

    populateTables([
      {
        title: 'Casa',
        rows: [
          { item: 'Aluguel', qty: 1, price: 250000 },
          { item: 'Luz', qty: 1, price: 18000 },
          { item: 'Internet', qty: 1, price: 12000 },
          { item: 'Água', qty: 1, price: 8500 },
          { item: 'Taxa de Condomio', qty: 1, price: 32000 },
          { item: 'Manutenção', qty: 1, price: 15000 },
        ],
      },
      {
        title: 'Necessidades',
        rows: [
          { item: 'Alimentação', qty: 1, price: 90000 },
          { item: 'Fármacia', qty: 1, price: 4500 },
          { item: 'Transporte', qty: 1, price: 15000 },
        ],
      },
      {
        title: 'Lazer',
        rows: [
          { item: 'Streaming', qty: 1, price: 2999 },
          { item: 'Cinema', qty: 2, price: 6000 },
          { item: 'Restaurantes', qty: 2, price: 12000 },
        ],
      },
      {
        title: 'Saúde',
        rows: [
          { item: 'Consulta', qty: 1, price: 15000 },
          { item: 'Remédios', qty: 1, price: 4500 },
          { item: 'Exames', qty: 1, price: 28000 },
        ],
      },
    ])

    cy.get('.expense-card:not(.add-card)').should('have.length', 4)

    cy.get('.expense-card:not(.add-card)').each(($card, index) => {
      const expectedRows = [
        ['Aluguel', 'Luz', 'Internet', 'Água', 'Taxa de Condomio', 'Manutenção'],
        ['Alimentação', 'Fármacia', 'Transporte'],
        ['Streaming', 'Cinema', 'Restaurantes'],
        ['Consulta', 'Remédios', 'Exames'],
      ][index]

      cy.wrap($card).find('tbody tr').should('have.length', expectedRows.length)
      cy.wrap($card).find('tbody tr').each(($row, rowIndex) => {
        cy.wrap($row)
          .find('input[data-item-id]')
          .should('have.value', expectedRows[rowIndex])
      })
    })
  })

  it('Permite exportar relatório em PDF', () => {
    seedPdfScenario()
    const pdfState = preparePdfSpies()

    cy.get('button[aria-label="Exportar relatório em PDF"]').click()

    cy.then(() => {
      expect(pdfState.createObjectUrlStub).to.have.been.called
      expect(pdfState.openStub).to.have.been.calledWith('blob:fake-pdf-url')
      expect(pdfState.createElementStub).to.have.been.calledWith('a')
      expect(pdfState.anchorClickStub).to.have.been.called
    })
  })
})