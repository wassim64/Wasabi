import json
import ijson
from collections import defaultdict
from itertools import combinations

def process_genre_connections():
    # Chemins des fichiers
    songs_path = 'json/song.json'
    artists_path = 'json/artist-without-members.json'
    cache_path = 'damien/cache'
    
    # Vérifier si les données en cache existent
    try:
        with open(f'{cache_path}_artist_genres.json', 'r', encoding='utf-8') as f:
            artist_genres = defaultdict(set, {k: set(v) for k, v in json.load(f).items()})
        with open(f'{cache_path}_genre_details.json', 'r', encoding='utf-8') as f:
            genre_details = defaultdict(lambda: {'song_count': 0, 'artist_count': 0, 'avg_duration': 0, 'total_duration': 0}, 
                                     json.load(f))
        with open(f'{cache_path}_genre_connections.json', 'r', encoding='utf-8') as f:
            genre_connections = defaultdict(lambda: defaultdict(int), json.load(f))
        print("Données chargées depuis le cache")
        
    except FileNotFoundError:
        print("Traitement des fichiers originaux...")
        # Structures de données
        artist_genres = defaultdict(set)  # {artist_id: set(genres)}
        genre_connections = defaultdict(lambda: defaultdict(int))  # {genre1: {genre2: count}}
        genre_details = defaultdict(lambda: {
            'song_count': 0,
            'artist_count': 0,
            'avg_duration': 0,
            'total_duration': 0
        })

        # Charger les artistes et leurs genres principaux
        with open(artists_path, 'r', encoding='utf-8') as file:
            for artist in ijson.items(file, 'item'):
                artist_id = artist.get('id_artist_deezer')
                if artist_id:
                    # Ajouter le genre principal de l'artiste
                    main_genre = artist.get('main_genre', '').lower()
                    if main_genre:
                        artist_genres[artist_id].add(main_genre)

        # Traiter les chansons
        with open(songs_path, 'r', encoding='utf-8') as file:
            for song in ijson.items(file, 'item'):
                artist_id = song.get('id_artist_deezer')
                album_genre = song.get('album_genre', '').lower()
                duration = int(song.get('duration', 0))
                
                if artist_id and album_genre:
                    # Ajouter le genre de l'album aux genres de l'artiste
                    artist_genres[artist_id].add(album_genre)
                    
                    # Mettre à jour les statistiques du genre
                    genre_details[album_genre]['song_count'] += 1
                    genre_details[album_genre]['total_duration'] += duration
                    
        # Calculer les connexions entre genres
        for artist_id, genres in artist_genres.items():
            # Mettre à jour le nombre d'artistes par genre
            for genre in genres:
                genre_details[genre]['artist_count'] += 1
            
            # Créer des connexions entre tous les genres d'un artiste
            for genre1, genre2 in combinations(genres, 2):
                genre_connections[genre1][genre2] += 1
                genre_connections[genre2][genre1] += 1

        # Calculer les moyennes de durée
        for genre in genre_details:
            if genre_details[genre]['song_count'] > 0:
                genre_details[genre]['avg_duration'] = (
                    genre_details[genre]['total_duration'] / 
                    genre_details[genre]['song_count']
                )

        # Sauvegarder les données intermédiaires
        with open(f'{cache_path}_artist_genres.json', 'w', encoding='utf-8') as f:
            json.dump({k: list(v) for k, v in artist_genres.items()}, f)
        with open(f'{cache_path}_genre_details.json', 'w', encoding='utf-8') as f:
            json.dump(dict(genre_details), f)
        with open(f'{cache_path}_genre_connections.json', 'w', encoding='utf-8') as f:
            json.dump(dict(genre_connections), f)

    # Préparer les données pour D3.js
    nodes = [
        {
            'id': genre,
            'songCount': details['song_count'],
            'artistCount': details['artist_count'],
            'avgDuration': details['avg_duration']
        }
        for genre, details in genre_details.items()
        if details['song_count'] > 0  # Filtrer les genres sans chansons
    ]

    edges = []
    for genre1 in genre_connections:
        for genre2, weight in genre_connections[genre1].items():
            if weight > 0:  # Ne garder que les connexions significatives
                edges.append({
                    'source': genre1,
                    'target': genre2,
                    'weight': weight
                })

    # Sauvegarder le résultat
    network_data = {
        'nodes': nodes,
        'links': edges
    }
    
    # Modification du chemin de sauvegarde pour genre_network.json
    output_path = 'damien/genre_network.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(network_data, f, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    process_genre_connections()