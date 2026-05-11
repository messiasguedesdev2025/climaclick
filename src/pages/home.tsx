import React from 'react';
// Importamos o hook!
import { useCitySearch } from '../hooks/useWeather'; 

const Home: React.FC = () => {
  // Aqui chamamos as ferramentas que seu hook oferece
  const { query, setQuery, suggestions, isSearching, error } = useCitySearch();

  return (
    <div style={{ padding: '20px' }}>
      <h1>🌦️ Clima Click</h1>
      
      {/* 1. O Campo de Busca */}
      <input
        type="text"
        placeholder="Digite o nome da cidade..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ padding: '10px', width: '300px' }}
      />

      {/* 2. Tratamento de Loading */}
      {isSearching && <p>Buscando cidades...</p>}

      {/* 3. Tratamento de Erro */}
     {error && <p style={{ color: 'red', fontWeight: 'bold' }}>Cidade não encontrada. Tente novamente!</p>}

      {/* 4. Exibição das Sugestões Dinâmicas */}
      <ul>
        {suggestions.map((cidade) => (
          <li key={cidade.id}>
            {cidade.name}, {cidade.admin1} - {cidade.country}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Home;
