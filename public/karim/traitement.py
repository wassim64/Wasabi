import json
import ijson
from collections import defaultdict
from datetime import datetime
from tqdm import tqdm

def process_genre_evolution():
    # Chemin du fichier
    songs_path = 'public/json/song.json'
    output_path = 'public/karim/genre_evolution.json'
    
    # Structure pour stocker les données
    genre_evolution = defaultdict(lambda: defaultdict(lambda: {
        "count": 0,
        "rank_sum": 0,
        "rank_avg": 0
    }))
    
    # Nombre de chansons à traiter
    songs_limit = 1000000
    print(f"Traitement de {songs_limit} chansons...")
    
    # Traiter les chansons avec barre de progression
    with open(songs_path, 'r', encoding='utf-8') as file:
        songs = ijson.items(file, 'item')
        
        for i, song in enumerate(tqdm(songs, total=songs_limit, desc="Traitement des chansons")):
            if i >= songs_limit:
                break
                
            # Extraire les données en une seule fois
            pub_date = song.get('publicationDate', '')
            genre = song.get('album_genre', '').lower()
            rank = song.get('rank', 0)
            
            # Vérifier les données en une seule condition
            if not (pub_date and genre and rank):
                continue
                
            try:
                year = datetime.strptime(pub_date, '%Y-%m-%d').year
                rank = float(rank)
                
                # Mettre à jour les compteurs
                year_genre = genre_evolution[str(year)][genre]
                year_genre["count"] += 1
                year_genre["rank_sum"] += rank
                year_genre["rank_avg"] = year_genre["rank_sum"] / year_genre["count"]
                
            except (ValueError, TypeError):
                continue
    
    # Filtrer les années finales entre 1950 et 2026 (pour éviter les années bug)
    filtered_evolution = {
        year: data 
        for year, data in genre_evolution.items() 
        if 1950 <= int(year) <= 2026
    }
    
    print("Sauvegarde des données...")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(filtered_evolution, f, ensure_ascii=False, indent=2)
    
    print("Traitement terminé!")

if __name__ == '__main__':
    process_genre_evolution()
