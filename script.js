const { useEffect, useMemo, useState, useRef } = React;

const STORAGE_KEY = "gastify-categories-v1";
const INCOME_KEY = "gastify-monthly-income-v1";
const COLOR_CLASSES = ["card-purple", "card-green", "card-orange", "card-blue"];

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const formatCurrency = (value) =>
	new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(Number.isFinite(value) ? value : 0);

const formatPriceDisplay = (priceInReais) => {
	if (!priceInReais || priceInReais === 0) return "";
	// Formata como moeda brasileira
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(priceInReais);
};

const parsePriceInput = (inputValue) => {
	// Remove tudo que não é dígito
	const digits = inputValue.replace(/\D/g, "");
	
	// Se vazio, retorna 0
	if (!digits) return 0;
	
	// Trata os dígitos como centavos e converte para reais
	const value = parseInt(digits, 10) / 100;
	
	// Limita a 10 milhões
	return Math.min(value, 10000000);
};

const capitalizeFirstLetter = (text) => {
	if (!text) return "";
	return text.charAt(0).toUpperCase() + text.slice(1);
};

const createRow = (item = "", qty = 1, price = 0) => ({
	id: createId(),
	item,
	qty,
	price,
});

const createCategory = (title, colorClass, items = []) => ({
	id: createId(),
	title,
	colorClass,
	items: items.length ? items : [createRow()],
});

const defaultCategories = [
	createCategory("Tabela 1", "card-purple", [
		createRow("Aluguel", 1, 1200),
		createRow("Internet", 1, 120),
		createRow("Luz", 1, 180),
		createRow("Água", 1, 90),
	]),
	createCategory("Tabela 2", "card-green", [
		createRow("Mercado", 1, 450),
		createRow("Transporte", 1, 150),
		createRow("Farmácia", 1, 60),
	]),
	createCategory("Tabela 3", "card-orange", [
		createRow("Academia", 1, 120),
		createRow("Streaming", 2, 55.9),
		createRow("Plano de celular", 1, 70),
	]),
];

function loadInitialCategories() {
	try {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (!saved) {
			return defaultCategories;
		}

		const parsed = JSON.parse(saved);
		if (!Array.isArray(parsed) || !parsed.length) {
			return defaultCategories;
		}

		return parsed.map((category, index) => ({
			id: category.id || createId(),
			title: category.title || `Tabela ${index + 1}`,
			colorClass: COLOR_CLASSES[index % COLOR_CLASSES.length],
			items: Array.isArray(category.items) && category.items.length
				? category.items.map((item) => ({
					id: item.id || createId(),
					item: item.item || "",
					qty: Number(item.qty) || 1,
					price: Number(item.price) || 0,
				}))
				: [createRow()],
		}));
	} catch {
		return defaultCategories;
	}
}

function loadInitialIncome() {
	try {
		const saved = localStorage.getItem(INCOME_KEY);
		return saved ? Number(saved) : 0;
	} catch {
		return 0;
	}
}

function App() {
	const [categories, setCategories] = useState(loadInitialCategories);
	const [monthlyIncome, setMonthlyIncome] = useState(loadInitialIncome);
	const [newCategoryTitle, setNewCategoryTitle] = useState("");
	const [autoFocusItemId, setAutoFocusItemId] = useState(null);
	const [chartMode, setChartMode] = useState("summary");
	const chartRef = useRef(null);
	const chartInstanceRef = useRef(null);

	useEffect(() => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
	}, [categories]);

	useEffect(() => {
		localStorage.setItem(INCOME_KEY, String(monthlyIncome));
	}, [monthlyIncome]);

	useEffect(() => {
		if (autoFocusItemId) {
			const input = document.querySelector(`input[data-item-id="${autoFocusItemId}"]`);
			input?.focus();
			setAutoFocusItemId(null);
		}
	}, [autoFocusItemId]);

	useEffect(() => {
		const el = document.querySelector('.cards-track');
		if (!el || typeof Sortable === 'undefined') return;

		const sortable = new Sortable(el, {
			// only allow dragging non-add cards
			draggable: '.expense-card:not(.add-card)',
			animation: 180,
			easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
			ghostClass: 'sortable-ghost',
			chosenClass: 'sortable-chosen',
			swapThreshold: 0.6,
			onEnd: (evt) => {
				const { oldIndex, newIndex } = evt;
				if (oldIndex === newIndex) return;
				setCategories((current) => {
					const copy = [...current];
					const [moved] = copy.splice(oldIndex, 1);
					copy.splice(newIndex, 0, moved);
					return copy;
				});
			},
		});

		return () => sortable.destroy();
	}, []);

	// Ajusta largura da coluna do gráfico baseada na largura das tabelas (cards-track)
	// (removed dynamic charts width effect — keep layout static and let CSS nth-of-type handle second section)

	useEffect(() => {
		if (!chartRef.current) return;
		
		const totalSpent = categories.flatMap((category) => category.items).reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.price) || 0), 0);
		const totalAvailable = Math.max(0, monthlyIncome - totalSpent);

		const ctx = chartRef.current.getContext('2d');

		// Destroy previous chart if it exists
		if (chartInstanceRef.current) {
			chartInstanceRef.current.destroy();
		}

		try {
			let chartData;

			if (chartMode === "summary") {
				// Modo resumo: Disponível vs Total Gasto
				chartData = {
					labels: ['Disponível', 'Gasto Total'],
					datasets: [
						{
							label: 'Valores (BRL)',
							data: [totalAvailable, totalSpent],
							backgroundColor: [
								'rgba(76, 175, 80, 0.9)',
								'rgba(244, 67, 54, 0.9)',
							],
							borderColor: [
								'rgba(56, 142, 60, 1)',
								'rgba(211, 47, 47, 1)',
							],
							borderWidth: 2,
							borderRadius: 12,
						},
					],
				};
			} else {
				// Modo categorias: comparar categorias umas com as outras
				// Usar cores relativas à classe de cada tabela (colorClass)
				const colorMap = {
					'card-purple': 'rgba(161, 120, 255, 0.9)',
					'card-green': 'rgba(76, 175, 80, 0.9)',
					'card-orange': 'rgba(255, 152, 0, 0.9)',
					'card-blue': 'rgba(66, 165, 245, 0.9)',
				};

				const categoryTotals = categories.map((cat) => {
					const total = cat.items.reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.price) || 0), 0);
					return { name: cat.title, total, colorClass: cat.colorClass };
				});

				chartData = {
					labels: categoryTotals.map((c) => c.name),
					datasets: [
						{
							// sem label para evitar a opção/entrada "Gasto por Categoria" na legenda
							data: categoryTotals.map((c) => c.total),
							backgroundColor: categoryTotals.map((c) => colorMap[c.colorClass] || 'rgba(130, 143, 177, 0.9)'),
							borderColor: categoryTotals.map((c) => (colorMap[c.colorClass] || 'rgba(130, 143, 177, 0.9)').replace('0.9', '1')),
							borderWidth: 2,
							borderRadius: 12,
						},
					],
				};
			}

			chartInstanceRef.current = new window.Chart(ctx, {
				type: 'bar',
				data: chartData,
				options: {
					indexAxis: 'x',
					responsive: true,
					maintainAspectRatio: true,
					barPercentage: 0.6,
					categoryPercentage: 0.7,
					plugins: {
						legend: {
							display: false,
							position: 'top',
							labels: {
								color: '#58647f',
								font: { size: 12, weight: '500' },
								padding: 12,
							},
						},
						tooltip: {
							backgroundColor: 'rgba(0, 0, 0, 0.8)',
							padding: 12,
							titleFont: { size: 14, weight: 'bold' },
							bodyFont: { size: 13 },
							cornerRadius: 8,
							callbacks: {
								label: function(context) {
									const value = (context.parsed && (context.parsed.y !== undefined ? context.parsed.y : context.parsed)) || 0;
									const label = context.label || '';
									return (label ? label + ': ' : '') + formatCurrency(value);
								},
							},
						},
					},
					scales: {
						y: {
							beginAtZero: true,
							ticks: {
								color: '#58647f',
								font: { size: 12, weight: '500' },
								callback: function(value) {
									return 'R$ ' + (value / 1000).toFixed(1) + 'k';
								},
							},
							grid: {
								color: 'rgba(130, 143, 177, 0.1)',
								drawBorder: false,
							},
						},
						x: {
							ticks: {
								color: '#58647f',
								font: { size: 14, weight: '600' },
							},
							grid: {
								display: false,
								drawBorder: false,
							},
						},
					},
				},
			});
		} catch (e) {
			console.error('Erro ao criar gráfico:', e);
		}
	}, [categories, monthlyIncome, chartMode]);

	// Enable drag-and-drop reordering of rows inside each table
	useEffect(() => {
		if (typeof Sortable === 'undefined') return;

		const instances = [];
		document.querySelectorAll('tbody[data-category-id]').forEach((tbody) => {
			const categoryId = tbody.dataset.categoryId;
			try {
				const s = new Sortable(tbody, {
					draggable: 'tr',
					animation: 150,
					handle: '.row-handle',
					ghostClass: 'sortable-ghost',
					onEnd: (evt) => {
						const { oldIndex, newIndex } = evt;
						if (oldIndex === newIndex) return;
						setCategories((current) =>
							current.map((cat) => {
								if (cat.id !== categoryId) return cat;
								const items = Array.isArray(cat.items) ? [...cat.items] : [];
								const [moved] = items.splice(oldIndex, 1);
								items.splice(newIndex, 0, moved);
								return { ...cat, items };
							}),
						);
					},
				});
				instances.push(s);
			} catch (e) {
				// ignore init errors per-table
			}
		});

		return () => instances.forEach((ins) => ins.destroy && ins.destroy());
	}, [categories]);

	// Exportar PDF: versão formatada com jsPDF + AutoTable e gráfico vetorial
	const exportPdf = async () => {
		try {
			const { jsPDF } = window.jspdf || {};
			if (!jsPDF) {
				alert('Biblioteca jsPDF não carregada');
				return;
			}

			const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
			const pageWidth = doc.internal.pageSize.getWidth();
			const pageHeight = doc.internal.pageSize.getHeight();
			const safeText = (value, x, y, options) => {
				if (!Number.isFinite(x) || !Number.isFinite(y)) {
					return;
				}
				try {
					doc.text(String(value), x, y, options);
				} catch (textError) {
					// ignore individual text layout issues
				}
			};

			// Header with gradient background
			doc.setFillColor(79, 102, 179); // Deep blue
			doc.rect(0, 0, pageWidth, 80, 'F');
			
			doc.setFontSize(28);
			doc.setTextColor(255, 255, 255);
			doc.setFont(undefined, 'bold');
			safeText('Gastify', 40, 35);
			
			doc.setFontSize(11);
			doc.setFont(undefined, 'normal');
			doc.setTextColor(220, 230, 245);
			safeText('Relatório de Despesas e Receitas', 40, 52);
			doc.setFontSize(8);
			doc.setTextColor(200, 220, 255);
			// Format date/time in dd/mm/yyyy hh:mm (pt-BR)
			const dateStr = `Gerado em ${new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date())}`;
			safeText(dateStr, 40, 68);

			// Summary Cards - Enhanced styling
			const cardHeight = 50;
			const cardWidth = (pageWidth - 120) / 3;
			const summaryY = 95;
			const totalSpent = metrics.total;
			const totalAvailable = Math.max(0, monthlyIncome - totalSpent);

			const summaryCards = [
				{ label: 'Renda Mensal', value: monthlyIncome, color: [76, 175, 80] },
				{ label: 'Total Gasto', value: totalSpent, color: [244, 67, 54] },
				{ label: 'Disponível', value: totalAvailable, color: [66, 165, 245] },
			];

			summaryCards.forEach((card, idx) => {
				const x = 40 + idx * (cardWidth + 20);
				
				// Card background with subtle border
				doc.setDrawColor(200, 200, 200);
				doc.setLineWidth(0.5);
				doc.setFillColor(255, 255, 255);
				doc.roundedRect(x, summaryY, cardWidth, cardHeight, 4, 4, 'FD');
				
				// Color bar at top
				doc.setFillColor(...card.color);
				doc.rect(x, summaryY, cardWidth, 4, 'F');
				
				// Label
				doc.setFontSize(9);
				doc.setTextColor(120, 120, 120);
				doc.setFont(undefined, 'normal');
					safeText(card.label, x + 12, summaryY + 16);
				
				// Value
				doc.setFontSize(13);
				doc.setTextColor(...card.color);
				doc.setFont(undefined, 'bold');
					safeText(formatCurrency(card.value), x + 12, summaryY + 36);
			});

			// Prepare chart data
			let labels = [];
			let values = [];
			let colors = [];
			const colorMap = {
				'card-purple': [161, 120, 255],
				'card-green': [76, 175, 80],
				'card-orange': [255, 152, 0],
				'card-blue': [66, 165, 245],
			};

			if (chartMode === 'categories') {
				labels = categories.map((c) => c.title);
				values = categories.map((c) => c.items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0));
				colors = categories.map((c) => colorMap[c.colorClass] || [130, 144, 182]);
			} else {
				labels = ['Disponível', 'Gasto Total'];
				values = [totalAvailable, totalSpent];
				colors = [[76, 175, 80], [244, 67, 54]];
			}

			// Chart section with improved styling
			const chartX = 40;
			const chartY = 165;
			const chartW = pageWidth - 80;
			const chartH = 160;
			const chartInnerTop = chartY + 36;
			const chartInnerBottom = chartY + chartH - 22;

			// Chart background
			doc.setDrawColor(220, 220, 220);
			doc.setLineWidth(0.5);
			doc.setFillColor(249, 250, 252);
			doc.roundedRect(chartX, chartY, chartW, chartH, 6, 6, 'FD');

			// Chart title
			doc.setFontSize(12);
			doc.setFont(undefined, 'bold');
			doc.setTextColor(31, 42, 68);
			{
				const chartTitle = chartMode === 'categories' ? 'Despesas por Categoria' : 'Resumo Financeiro';
				const chartTitleWidth = doc.getTextWidth(chartTitle);
				safeText(chartTitle, chartX + (chartW - chartTitleWidth) / 2, chartY + 18);
			}
			doc.setFontSize(8);
			doc.setFont(undefined, 'normal');
			doc.setTextColor(110, 118, 140);
			{
				const chartSubtitle = 'Valores consolidados por categoria';
				const chartSubtitleWidth = doc.getTextWidth(chartSubtitle);
				safeText(chartSubtitle, chartX + (chartW - chartSubtitleWidth) / 2, chartY + 29);
			}

			// compute scale
			const maxVal = Math.max(...values, 1);
			const steps = 4;
			const stepVal = Math.ceil(maxVal / steps);
			const maxY = stepVal * steps;

			// draw grid lines and labels
			doc.setFontSize(8);
			doc.setFont(undefined, 'normal');
			doc.setTextColor(150, 160, 180);
			for (let i = 0; i <= steps; i++) {
				const y = chartInnerTop + (chartInnerBottom - chartInnerTop) * (1 - i / steps);
				doc.setDrawColor(235, 240, 250);
				doc.setLineWidth(0.3);
				doc.line(chartX + 38, y, chartX + chartW - 12, y);
				const val = Math.round((i / steps) * maxY);
					safeText(`R$ ${val.toLocaleString('pt-BR')}`, chartX + 8, y + 2);
			}

			// draw bars with shadow effect
			const plotX = chartX + 50;
			const plotW = chartW - 82;
			const barGap = Math.max(8, Math.min(16, Math.floor(plotW / Math.max(5, labels.length * 5))));
			const barWidth = Math.max(26, (plotW - (labels.length - 1) * barGap) / labels.length);
			
			labels.forEach((lab, idx) => {
				const v = values[idx] || 0;
				const h = (v / maxY) * (chartInnerBottom - chartInnerTop);
				const bx = plotX + idx * (barWidth + barGap);
				const by = chartInnerBottom - h;
				
				// Shadow effect
				doc.setFillColor(215, 218, 225);
				doc.roundedRect(bx + 2, by + 3, barWidth, h, 5, 5, 'F');
				
				// Bar with color
				doc.setFillColor(...colors[idx]);
				doc.roundedRect(bx, by, barWidth, h, 5, 5, 'F');

				// top highlight
				try {
					const highlight = colors[idx].map((c) => Math.min(255, c + 20));
					doc.setFillColor(...highlight);
					doc.roundedRect(bx + 1, by + 1, barWidth - 2, Math.max(3, Math.min(10, h * 0.14)), 4, 4, 'F');
				} catch (highlightError) {
					// ignore
				}
				
				// value label on top
				doc.setFontSize(8);
				doc.setFont(undefined, 'bold');
				doc.setTextColor(31, 42, 68);
				if (h > 24) {
					doc.setTextColor(255, 255, 255);
					{
						const valueText = String(formatCurrency(v));
						const valueTextWidth = doc.getTextWidth(valueText);
						safeText(valueText, bx + (barWidth - valueTextWidth) / 2, by + Math.max(12, h / 2 + 2));
					}
				} else {
					{
						const valueText = String(formatCurrency(v));
						const valueTextWidth = doc.getTextWidth(valueText);
						safeText(valueText, bx + (barWidth - valueTextWidth) / 2, by - 5);
					}
				}
				
				// category label
				doc.setFontSize(9);
				doc.setFont(undefined, 'normal');
				doc.setTextColor(80, 100, 120);
				{
					const labelText = String(lab);
					const labelTextWidth = doc.getTextWidth(labelText);
						safeText(labelText, bx + (barWidth - labelTextWidth) / 2, chartInnerBottom + 10);
				}
			});

			let tableStartY = chartY + chartH + 20;

			// Use AutoTable to print items per category with enhanced styling
			if (Array.isArray(categories) && categories.length) {
				for (let ci = 0; ci < categories.length; ci++) {
					const cat = categories[ci];
					const catColor = colorMap[cat.colorClass] || [130, 144, 182];
					const tableMarginLeft = 40;
					const tableMarginRight = 40;
					const contentTableWidth = pageWidth - tableMarginLeft - tableMarginRight;
					
					const head = [['Item', 'Qtd', 'Preço (un)', 'Subtotal']];
					const bodyRows = cat.items.map((it) => {
						const subtotal = (Number(it.qty) || 0) * (Number(it.price) || 0);
						return [it.item || '-', it.qty || 0, formatCurrency(it.price || 0), formatCurrency(subtotal)];
					});

					// Add category total row
					const categoryTotal = cat.items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);
					bodyRows.push(['Total', '', '', formatCurrency(categoryTotal)]);

					// Category title
					doc.setFontSize(12);
					doc.setFont(undefined, 'bold');
					doc.setTextColor(...catColor);
					safeText(cat.title, tableMarginLeft, tableStartY - 4);

					// Define widths (in points) for numeric columns; remaining width goes to the Item column
					const qtyColW = 64;
					const priceColW = 96;
					const subtotalColW = 96;
					const itemColW = Math.max(80, contentTableWidth - (qtyColW + priceColW + subtotalColW));

					doc.autoTable({
						startY: tableStartY + 10,
						head: head,
						body: bodyRows,
						margin: { left: tableMarginLeft, right: tableMarginRight },
						tableWidth: contentTableWidth,
						styles: {
							fontSize: 9,
							cellPadding: 6,
							overflow: 'linebreak',
							halign: 'left',
							valign: 'middle'
						},
						headStyles: {
							fillColor: catColor,
							textColor: [255, 255, 255],
							fontStyle: 'bold',
							halign: 'center',
							valign: 'middle'
						},
						bodyStyles: {
							textColor: [50, 50, 50]
						},
						alternateRowStyles: {
							fillColor: [248, 249, 250]
						},
						columnStyles: {
							0: { cellWidth: itemColW, halign: 'left' },
							1: { cellWidth: qtyColW, halign: 'center' },
							2: { cellWidth: priceColW, halign: 'right' },
							3: { cellWidth: subtotalColW, halign: 'right', fontStyle: 'bold' }
						},
						didParseCell: function(data) {
							// Style the last row (category total) differently
							if (data.row.section === 'body' && data.row.index === bodyRows.length - 1) {
								data.cell.styles.fontStyle = 'bold';
								data.cell.styles.textColor = [31, 42, 68];
								data.cell.styles.fillColor = [246, 247, 249];
							}
						},
						didDrawPage: function(data) {
							// Footer - page numbers handled separately
						}
					});

					tableStartY = doc.lastAutoTable.finalY + 14;
					
					// if next table overflows, add page
					if (tableStartY > pageHeight - 60 && ci < categories.length - 1) {
						doc.addPage();
						tableStartY = 30;
					}
				}
			}

			// Add professional footer
			const pageCount = doc.getNumberOfPages();
			doc.setFontSize(8);
			for (let i = 1; i <= pageCount; i++) {
				doc.setPage(i);
				
				// Footer line
				doc.setDrawColor(220, 220, 220);
				doc.setLineWidth(0.5);
				doc.line(40, pageHeight - 24, pageWidth - 40, pageHeight - 24);
				
				// Page numbers
				doc.setTextColor(150, 150, 150);
				safeText(`Página ${i} / ${pageCount}`, pageWidth / 2 - 22, pageHeight - 14);
				
				// Timestamp
				doc.setFontSize(7);
				safeText(`Gastify © ${new Date().getFullYear()}`, 40, pageHeight - 14);
			}

			// Gerar PDF como blob e abrir no navegador + baixar
			const pdfBlob = doc.output('blob');
			const pdfUrl = URL.createObjectURL(pdfBlob);
			
			// Abrir em nova aba
			window.open(pdfUrl);
			
			// Também fazer download automático
			const link = document.createElement('a');
			link.href = pdfUrl;
			link.download = 'gastify-relatorio.pdf';
			link.click();
		} catch (e) {
			console.error('Erro exportando PDF formatado', e);
			alert('Erro ao gerar PDF formatado. Veja console para detalhes.');
		}
	};

	const metrics = useMemo(() => {
		const allItems = categories.flatMap((category) => category.items);
		const total = allItems.reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.price) || 0), 0);

		return {
			total,
			categories: categories.length,
			items: allItems.filter((item) => item.item.trim()).length,
		};
	}, [categories]);

	const updateCategoryTitle = (categoryId, title) => {
		setCategories((currentCategories) =>
			currentCategories.map((category) =>
				category.id === categoryId ? { ...category, title } : category,
			),
		);
	};

	const updateItem = (categoryId, itemId, field, value) => {
		setCategories((currentCategories) =>
			currentCategories.map((category) => {
				if (category.id !== categoryId) {
					return category;
				}

				return {
					...category,
					items: category.items.map((item) => {
						if (item.id !== itemId) {
							return item;
						}

						if (field === "qty" || field === "price") {
							return { ...item, [field]: value === "" ? "" : Number(value) };
						}

						return { ...item, [field]: value };
					}),
				};
			}),
		);
	};

	const addRow = (categoryId) => {
		let newRowId = null;
		setCategories((currentCategories) => {
			const idx = currentCategories.findIndex((c) => c.id === categoryId);
			if (idx === -1) return currentCategories;
			if ((currentCategories[idx].items || []).length >= 15) return currentCategories;
			const newRow = createRow();
			newRowId = newRow.id;
			const copy = [...currentCategories];
			copy[idx] = { ...copy[idx], items: [...copy[idx].items, newRow] };
			return copy;
		});
		if (newRowId) setAutoFocusItemId(newRowId);
	};

	const removeRow = (categoryId, itemId) => {
		setCategories((currentCategories) =>
			currentCategories
				.map((category) => {
					if (category.id !== categoryId) {
						return category;
					}

					const filteredItems = category.items.filter((item) => item.id !== itemId);
					return {
						...category,
						items: filteredItems.length ? filteredItems : [createRow()],
					};
				})
				.filter(Boolean),
		);
	};

	const removeCategory = (categoryId) => {
		setCategories((currentCategories) => currentCategories.filter((category) => category.id !== categoryId));
	};

	const addCategory = (event) => {
		if (event) event.preventDefault();
		// Prevent creating more than 15 tables
		if (categories.length >= 15) return;
		const title = newCategoryTitle.trim();
		const defaultTitle = `Tabela ${categories.length + 1}`;

		setCategories((currentCategories) => [
			...currentCategories,
			createCategory(title || defaultTitle, COLOR_CLASSES[currentCategories.length % COLOR_CLASSES.length]),
		]);
		setNewCategoryTitle("");
	};

	return (
		<div className="page-shell">
			<header className="topbar">
				<div className="brand-lockup">
					<div className="brand-mark">
						<img src="icons/logo.png" alt="Gastify" />
					</div>
					<div>
						<h1>Gastify</h1>
					</div>
				</div>
			</header>

			<main className="dashboard">
				<section className="hero-card">
					<div className="hero-copy">
						<h2>Organize categorias, cadastre gastos e acompanhe o total com clareza.</h2>
					</div>

					<div className="hero-metrics" aria-label="Indicadores principais">
						<article className="metric">
							<span>Renda mensal</span>
							<input
								type="text"
								inputMode="decimal"
								value={formatPriceDisplay(monthlyIncome)}
								onChange={(e) => setMonthlyIncome(parsePriceInput(e.target.value))}
								className="income-input"
								placeholder="0,00"
								aria-label="Renda mensal"
							/>
						</article>
						<article className="metric metric-primary">
							<span>Total gasto</span>
							<strong>{formatCurrency(metrics.total)}</strong>
						</article>
						<article className="metric">
							<span>Categorias ativas</span>
							<strong>{metrics.categories}</strong>
						</article>
						<article className="metric">
							<span>Registros listados</span>
							<strong>{metrics.items}</strong>
						</article>
					</div>
				</section>

				<section className="board-section" aria-labelledby="board-title">
					<div className="board-header">
						<div>
							<h3 id="board-title">Tabelas de gastos</h3>
						</div>
					</div>

					<div className="cards-viewport">
						<div className="cards-track">
						{categories.map((category) => {
							const categoryTotal = category.items.reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.price) || 0), 0);

							return (
								<article key={category.id} className={`expense-card ${category.colorClass}`}>
									<header className="card-head">
										<input
											className="card-title-input"
											value={category.title}
											onChange={(event) => updateCategoryTitle(category.id, event.target.value)}
											aria-label="Nome da tabela"
										/>
										<div className="card-total">{formatCurrency(categoryTotal)}</div>
									</header>

									<table>
										<thead>
											<tr>
												<th>Item</th>
												<th>Qtd</th>
												<th>Preço</th>
												<th></th>
											</tr>
										</thead>
										<tbody data-category-id={category.id}>
											{category.items.map((item, itemIndex) => {
												const isLastItem = itemIndex === category.items.length - 1;
												return (
												<tr key={item.id}>
													<td>
														<span className="row-handle" aria-hidden title="Arrastar linha">⋮⋮</span>
														<input
															className="cell-input"
															data-item-id={item.id}
															value={item.item}
															maxLength={20}
															onChange={(event) => updateItem(category.id, item.id, "item", capitalizeFirstLetter(event.target.value.slice(0,20)))}
															onKeyDown={(event) => {
																if (event.key === "Enter") {
																	event.preventDefault();
																	const qtyInput = event.currentTarget.parentElement.parentElement.querySelector("input[data-field='qty']");
																	qtyInput?.focus();
																}
															}}
															placeholder="Digite o item"
														/>
													</td>
													<td>
														<input
															className="cell-input cell-input-center"
															type="number"
															min="1"
															max="99"
															step="1"
															value={item.qty}
															data-field="qty"
															onChange={(event) => {
																const raw = event.target.value;
																if (raw === "") {
																	updateItem(category.id, item.id, "qty", "");
																	return;
																}
																const digits = String(raw).replace(/\D/g, "");
																let n = parseInt(digits || "0", 10);
																if (n < 1) n = 1;
																if (n > 99) n = 99;
																updateItem(category.id, item.id, "qty", String(n));
															}}
															onBlur={(event) => {
																const raw = event.target.value;
																if (raw === "" || Number(raw) < 1) {
																	updateItem(category.id, item.id, "qty", "1");
																}
															}}
															onKeyDown={(event) => {
																if (event.key === "Enter") {
																	event.preventDefault();
																	const priceInput = event.currentTarget.parentElement.parentElement.querySelector("input[data-field='price']");
																	priceInput?.focus();
																}
															}}
														/>
													</td>
													<td>
														<input
															className="cell-input"
														type="text"
														inputMode="decimal"
														placeholder="0,00"
															data-field="price"
															value={formatPriceDisplay(item.price)}
															onChange={(event) => updateItem(category.id, item.id, "price", String(parsePriceInput(event.target.value)))}
															onKeyDown={(event) => {
																if (event.key === "Enter") {
																	event.preventDefault();
																	if (isLastItem) {
																		addRow(category.id);
																	} else {
																		const nextRow = event.currentTarget.parentElement.parentElement.nextElementSibling;
																		const nextItemInput = nextRow?.querySelector("input[data-field='item']");
																		nextItemInput?.focus();
																	}
																}
															}}
														/>
													</td>
													<td>
														<button type="button" className="icon-button" onClick={() => removeRow(category.id, item.id)} aria-label="Excluir linha">
															<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-backspace" viewBox="0 0 16 16" aria-hidden="true">
															  <path d="M5.83 5.146a.5.5 0 0 0 0 .708L7.975 8l-2.147 2.146a.5.5 0 0 0 .707.708l2.147-2.147 2.146 2.147a.5.5 0 0 0 .707-.708L9.39 8l2.146-2.146a.5.5 0 0 0-.707-.708L8.683 7.293 6.536 5.146a.5.5 0 0 0-.707 0z" />
															  <path d="M13.683 1a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-7.08a2 2 0 0 1-1.519-.698L.241 8.65a1 1 0 0 1 0-1.302L5.084 1.7A2 2 0 0 1 6.603 1zm-7.08 1a1 1 0 0 0-.76.35L1 8l4.844 5.65a1 1 0 0 0 .759.35h7.08a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z" />
															</svg>
														</button>
													</td>
												</tr>
											);
										})}
										</tbody>
									</table>

									<footer className="card-foot">
									</footer>
									<button
										type="button"
										className="icon-button delete-table"
										aria-label="Excluir tabela"
										onClick={() => removeCategory(category.id)}
									>
										<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-trash" viewBox="0 0 16 16" aria-hidden="true">
										  <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
										  <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
										</svg>
									</button>

									<button
										type="button"
										className="icon-button add-row"
										aria-label="Adicionar linha"
										onClick={() => addRow(category.id)}
										disabled={category.items.length >= 15}
										title={category.items.length >= 15 ? 'Limite de 15 itens atingido' : 'Adicionar linha'}
									>
										+
									</button>
								</article>
							);
						})}

						{categories.length < 15 && (
							<article className="expense-card card-blue add-card">
								<div
									className="add-badge"
									role="button"
									tabIndex={0}
									aria-label="Criar tabela"
									onClick={addCategory}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
											e.preventDefault();
											addCategory();
										}
									}}
								>
									+
								</div>
								<form className="new-table-form" onSubmit={addCategory}>
									<input
										className="new-table-input"
										type="text"
										placeholder="Nome da tabela"
										value={newCategoryTitle}
										onChange={(event) => setNewCategoryTitle(event.target.value)}
									/>
								</form>
							</article>
						)}
						</div>
					</div>
				</section>

				<section className="charts-section">
					<div className="section-header">
						<h3>Gráficos & Resumo</h3>
						<button
							className="chart-mode-toggle"
							onClick={() => setChartMode(chartMode === "summary" ? "categories" : "summary")}
							aria-label="Alternar modo de visualização do gráfico"
							title={chartMode === "summary" ? "Ver por categoria" : "Ver resumo"}
						>
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-arrow-down-up" viewBox="0 0 16 16">
								<path fillRule="evenodd" d="M11.5 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L11 2.707V14.5a.5.5 0 0 0 .5.5m-7-14a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L4 13.293V1.5a.5.5 0 0 1 .5-.5"/>
							</svg>
						</button>
					</div>
					<div className="charts-container">
						<div className="chart-card">
							<div className="chart-wrapper">
								<canvas ref={chartRef}></canvas>
							</div>
						</div>
						{chartMode === "summary" && (
							<div className="chart-stats">
								<div className="stat-item">
									<div className="stat-label">
										<span>Renda Mensal</span>
										<div className="stat-value">{formatCurrency(monthlyIncome)}</div>
									</div>
								</div>
								<div className={`stat-item ${metrics.total <= monthlyIncome ? 'positive' : 'negative'}`}>
									<div className="stat-label">
										<span>Total Gasto</span>
										<div className="stat-value">{formatCurrency(metrics.total)}</div>
										{monthlyIncome > 0 && (
											<div className="stat-percentage">
												{((metrics.total / monthlyIncome) * 100).toFixed(1)}% da renda
											</div>
										)}
									</div>
								</div>
								<div className={`stat-item ${monthlyIncome - metrics.total >= 0 ? 'positive' : 'negative'}`}>
									<div className="stat-label">
										<span>Disponível</span>
										<div className="stat-value">{formatCurrency(Math.max(0, monthlyIncome - metrics.total))}</div>
										{monthlyIncome > 0 && (
											<div className="stat-percentage">
												{((Math.max(0, monthlyIncome - metrics.total) / monthlyIncome) * 100).toFixed(1)}% restante
											</div>
										)}
									</div>
								</div>
							</div>
						)}
						<button className="export-pdf-btn" onClick={exportPdf} aria-label="Exportar relatório em PDF">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
								<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round"></path>
								<path d="M7 10l5 5 5-5" strokeLinecap="round" strokeLinejoin="round"></path>
								<path d="M12 15V3" strokeLinecap="round" strokeLinejoin="round"></path>
							</svg>
							<div className="export-pdf-text">
								<span className="export-pdf-label">Exportar</span>
								<span className="export-pdf-desc">Relatório PDF</span>
							</div>
						</button>
					</div>
				</section>
			</main>
		</div>
	);
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);