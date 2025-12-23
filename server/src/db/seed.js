// Seed initial game data based on architecture document

function seedDatabase(db) {
  // Check if already seeded
  const portCount = db.prepare('SELECT COUNT(*) as count FROM ports').get();
  if (portCount.count > 0) {
    console.log('Database already seeded, skipping...');
    return;
  }

  console.log('Seeding database...');

  // Seed goods
  const goodsData = [
    { name: 'Tea', base_price: 50.0, volume_per_unit: 1, category: 'luxury', volatility: 1.2 },
    { name: 'Silk', base_price: 100.0, volume_per_unit: 1, category: 'luxury', volatility: 1.5 },
    { name: 'Spices', base_price: 80.0, volume_per_unit: 1, category: 'luxury', volatility: 1.3 },
    { name: 'Porcelain', base_price: 120.0, volume_per_unit: 2, category: 'luxury', volatility: 1.1 },
    { name: 'Opium', base_price: 200.0, volume_per_unit: 1, category: 'contraband', volatility: 2.0 },
    { name: 'Silver', base_price: 150.0, volume_per_unit: 3, category: 'staple', volatility: 0.8 },
  ];

  const insertGood = db.prepare(`
    INSERT INTO goods (name, base_price, volume_per_unit, category, volatility, legal_status_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const goodIds = {};
  for (const good of goodsData) {
    const result = insertGood.run(
      good.name,
      good.base_price,
      good.volume_per_unit,
      good.category,
      good.volatility,
      JSON.stringify({}) // Legal status per faction - to be expanded
    );
    goodIds[good.name] = result.lastInsertRowid;
  }

  // Seed ports (MVP - 5 ports in South China Sea zone)
  const portsData = [
    {
      name: 'Canton (Guangzhou)',
      region: 'South China Coast',
      faction: 'Qing China',
      base_security_level: 70,
      connected_ports: ['Macau', 'Hong Kong'],
    },
    {
      name: 'Macau',
      region: 'South China Coast',
      faction: 'Portuguese',
      base_security_level: 60,
      connected_ports: ['Canton (Guangzhou)', 'Hong Kong', 'Manila'],
    },
    {
      name: 'Hong Kong',
      region: 'South China Coast',
      faction: 'Qing China',
      base_security_level: 50,
      connected_ports: ['Canton (Guangzhou)', 'Macau', 'Manila'],
    },
    {
      name: 'Manila',
      region: 'Southeast Asia',
      faction: 'Spanish',
      base_security_level: 55,
      connected_ports: ['Macau', 'Hong Kong'],
    },
    {
      name: 'Nagasaki',
      region: 'Japan',
      faction: 'Tokugawa Japan',
      base_security_level: 80,
      connected_ports: ['Canton (Guangzhou)'],
    },
  ];

  const insertPort = db.prepare(`
    INSERT INTO ports (name, region, faction, base_security_level, connected_ports_json)
    VALUES (?, ?, ?, ?, ?)
  `);

  const portIds = {};
  for (const port of portsData) {
    const result = insertPort.run(
      port.name,
      port.region,
      port.faction,
      port.base_security_level,
      JSON.stringify(port.connected_ports)
    );
    portIds[port.name] = result.lastInsertRowid;
  }

  // Seed port goods (each port has different supply/demand)
  const portGoodsConfig = {
    'Canton (Guangzhou)': {
      Tea: { stock: 1000, capacity: 2000, price_mod: 0.7 },
      Silk: { stock: 800, capacity: 1500, price_mod: 0.7 },
      Porcelain: { stock: 600, capacity: 1000, price_mod: 0.8 },
      Spices: { stock: 200, capacity: 500, price_mod: 1.3 },
      Silver: { stock: 100, capacity: 300, price_mod: 1.5 },
      Opium: { stock: 50, capacity: 200, price_mod: 1.2 },
    },
    'Macau': {
      Tea: { stock: 300, capacity: 800, price_mod: 1.1 },
      Silk: { stock: 200, capacity: 600, price_mod: 1.2 },
      Porcelain: { stock: 150, capacity: 400, price_mod: 1.1 },
      Spices: { stock: 400, capacity: 1000, price_mod: 0.9 },
      Silver: { stock: 500, capacity: 1000, price_mod: 0.8 },
      Opium: { stock: 100, capacity: 300, price_mod: 1.0 },
    },
    'Hong Kong': {
      Tea: { stock: 400, capacity: 1000, price_mod: 1.0 },
      Silk: { stock: 300, capacity: 800, price_mod: 1.0 },
      Porcelain: { stock: 200, capacity: 600, price_mod: 1.0 },
      Spices: { stock: 300, capacity: 800, price_mod: 1.0 },
      Silver: { stock: 200, capacity: 500, price_mod: 1.2 },
      Opium: { stock: 150, capacity: 400, price_mod: 0.9 },
    },
    'Manila': {
      Tea: { stock: 150, capacity: 400, price_mod: 1.4 },
      Silk: { stock: 100, capacity: 300, price_mod: 1.5 },
      Porcelain: { stock: 80, capacity: 250, price_mod: 1.3 },
      Spices: { stock: 600, capacity: 1500, price_mod: 0.7 },
      Silver: { stock: 800, capacity: 2000, price_mod: 0.6 },
      Opium: { stock: 50, capacity: 200, price_mod: 1.1 },
    },
    'Nagasaki': {
      Tea: { stock: 200, capacity: 600, price_mod: 1.2 },
      Silk: { stock: 150, capacity: 500, price_mod: 1.3 },
      Porcelain: { stock: 100, capacity: 400, price_mod: 1.2 },
      Spices: { stock: 100, capacity: 300, price_mod: 1.4 },
      Silver: { stock: 600, capacity: 1500, price_mod: 0.7 },
      Opium: { stock: 30, capacity: 100, price_mod: 2.0 },
    },
  };

  const insertPortGood = db.prepare(`
    INSERT INTO port_goods (port_id, good_id, stock, stock_capacity, base_price)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const [portName, goods] of Object.entries(portGoodsConfig)) {
    const portId = portIds[portName];
    for (const [goodName, config] of Object.entries(goods)) {
      const goodId = goodIds[goodName];
      const good = goodsData.find(g => g.name === goodName);
      insertPortGood.run(
        portId,
        goodId,
        config.stock,
        config.capacity,
        good.base_price * config.price_mod
      );
    }
  }

  console.log('Database seeded successfully!');
  console.log(`- ${goodsData.length} goods`);
  console.log(`- ${portsData.length} ports`);
  console.log(`- ${Object.keys(portGoodsConfig).length * 6} port-good relationships`);
}

module.exports = { seedDatabase };
