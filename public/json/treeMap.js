import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

const GenreSearch = () => {
  const [genre, setGenre] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!genre.trim()) {
      setError('Veuillez entrer un genre musical');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/search-genre', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ genre: genre.trim() }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la recherche du genre');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Recherche de Genre Musical</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            placeholder="Entrez un genre musical..."
            className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 disabled:bg-blue-300"
          >
            <Search size={20} />
            {loading ? 'Recherche...' : 'Rechercher'}
          </button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Résultats pour : {result.genre}</h3>
            <div className="space-y-2">
              {result.parent_genres.length > 0 && (
                <div>
                  <p className="font-medium">Genres parents :</p>
                  <ul className="list-disc ml-6">
                    {result.parent_genres.map((parent, index) => (
                      <li key={index}>{parent}</li>
                    ))}
                  </ul>
                </div>
              )}
              {result.subgenres.length > 0 && (
                <div>
                  <p className="font-medium">Sous-genres :</p>
                  <ul className="list-disc ml-6">
                    {result.subgenres.map((subgenre, index) => (
                      <li key={index}>
                        {typeof subgenre === 'string' 
                          ? subgenre 
                          : subgenre.genre
                        }
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GenreSearch;