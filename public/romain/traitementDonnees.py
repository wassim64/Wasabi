from flask import Flask,request, jsonify
import ijson
from flask_cors import CORS 
from collections import defaultdict
from datetime import datetime
import json

app = Flask(__name__)
CORS(app) 
date_format = "%Y-%m-%d"

@app.route('/run-script', methods=['GET'])
def run_script():
    artist_file_path = '../json/artist-without-members.json'
    json_file_path = '../json/song.json'
    
    output_json_path = 'output_songs_by_genre.json'
    
    artist_songs = defaultdict(list)
    genre = request.args.get('genre')
    if genre :
        print("ok")
    else :
        genre = "rock"
    # Charger les noms des artistes
    def load_artist_names(artist_file_path):
        artist_names = {}
        with open(artist_file_path, 'r', encoding='utf-8') as file:
            for obj in ijson.items(file, 'item'):
                artist_id = obj.get('id_artist_deezer')
                artist_name = obj.get('name')
                if artist_id and artist_name:
                    artist_names[artist_id] = artist_name
        return artist_names

    artist_names = load_artist_names(artist_file_path)

    with open(json_file_path, 'r', encoding='utf-8') as file:
        i = 0
        for obj in ijson.items(file, 'item'):
            if i < 10000:
                artist_id = obj.get('id_artist_deezer', 'unknown')
                song_name = obj['name']
                album_genre = obj['album_genre']
                publication_date = obj['publicationDate']
                
                if genre in album_genre.lower():
                    if publication_date and publication_date != "0000-00-00":
                        artist_songs[(artist_id, album_genre)].append((publication_date, song_name))
                i += 1
            else:
                break

    result_data = []
    for key, songs in artist_songs.items():
        artist_id, album_genre = key
        valid_dates = [song[0] for song in songs if song[0] != "0000-00-00"]
        valid_dates.sort()

        if valid_dates:
            first_song_date = valid_dates[0]
            last_song_date = valid_dates[-1]

            date1 = datetime.strptime(first_song_date, date_format)
            date2 = datetime.strptime(last_song_date, date_format)
            date_diff = date2 - date1
            
            artist_name = artist_names.get(artist_id, "Unknown Artist")

            result_data.append({
                'artist_id': artist_id,
                'artist_name': artist_name,
                'genre': album_genre,
                'first_date': first_song_date,
                'last_date': last_song_date,
                'date_difference': date_diff.days,
                'all_dates': valid_dates
            })

    with open(output_json_path, 'w', encoding='utf-8') as outfile:
        json.dump(result_data, outfile, ensure_ascii=False, indent=4)

    return jsonify(result_data)

if __name__ == '__main__':
    app.run(debug=True)
    