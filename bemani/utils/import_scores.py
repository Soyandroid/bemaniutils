# vim: set fileencoding=utf-8

import csv  # type: ignore
import argparse
import yaml  # type: ignore
from typing import Any, Dict

from bemani.common import GameConstants, DBConstants, Model
from bemani.data import Data, UserID
from bemani.backend.jubeat import JubeatBase


class ImportJubeat():
    GAME_FLAG_BIT_PLAYED = 0x1
    GAME_FLAG_BIT_CLEARED = 0x2
    GAME_FLAG_BIT_FULL_COMBO = 0x4
    GAME_FLAG_BIT_EXCELLENT = 0x8
    GAME_FLAG_BIT_NEARLY_FULL_COMBO = 0x10
    GAME_FLAG_BIT_NEARLY_EXCELLENT = 0x20
    GAME_FLAG_BIT_NO_GRAY = 0x40
    GAME_FLAG_BIT_NO_YELLOW = 0x80

    PLAY_MEDAL_FAILED = DBConstants.JUBEAT_PLAY_MEDAL_FAILED
    PLAY_MEDAL_CLEARED = DBConstants.JUBEAT_PLAY_MEDAL_CLEARED
    PLAY_MEDAL_NEARLY_FULL_COMBO = DBConstants.JUBEAT_PLAY_MEDAL_NEARLY_FULL_COMBO
    PLAY_MEDAL_FULL_COMBO = DBConstants.JUBEAT_PLAY_MEDAL_FULL_COMBO
    PLAY_MEDAL_NEARLY_EXCELLENT = DBConstants.JUBEAT_PLAY_MEDAL_NEARLY_EXCELLENT
    PLAY_MEDAL_EXCELLENT = DBConstants.JUBEAT_PLAY_MEDAL_EXCELLENT

    def __init__(self) -> None:
        return

    def import_scores(self, userid: UserID, tsvfile: str, data: Data, config: Dict[str, Any], model: Model) -> None:
        jubeat = JubeatBase(data, config, model)
        with open(tsvfile, newline='') as tsvhandle:
            jubeatreader = csv.reader(tsvhandle, delimiter='\t', quotechar='"')  # type: ignore
            for row in jubeatreader:
                songid = int(row[0])
                timestamp = int(row[1]) / 1000
                score = int(row[2])
                clear_type = int(row[3])
                chart = int(row[4])
                stats = {
                    'perfect': int(row[5]),
                    'great': int(row[6]),
                    'good': int(row[7]),
                    'poor': int(row[8]),
                    'miss': int(row[9]),
                }
                ghost = list(bytes(row[10], 'latin-1'))
                music_rate = int(row[11])
                hard_mode = int(row[12])
                mapping = {
                    self.GAME_FLAG_BIT_CLEARED: self.PLAY_MEDAL_CLEARED,
                    self.GAME_FLAG_BIT_FULL_COMBO: self.PLAY_MEDAL_FULL_COMBO,
                    self.GAME_FLAG_BIT_EXCELLENT: self.PLAY_MEDAL_EXCELLENT,
                    self.GAME_FLAG_BIT_NEARLY_FULL_COMBO: self.PLAY_MEDAL_NEARLY_FULL_COMBO,
                    self.GAME_FLAG_BIT_NEARLY_EXCELLENT: self.PLAY_MEDAL_NEARLY_EXCELLENT,
                }
                # Figure out the highest medal based on bits passed in
                medal = self.PLAY_MEDAL_FAILED
                for bit in mapping:
                    if clear_type & bit > 0:
                        medal = max(medal, mapping[bit])
                if hard_mode:
                    chart += 3
                jubeat.version = 13
                if stats['poor'] == 0 and stats['miss'] == 0:  # Echidna doesn't store combo currently so calculate combo for FCs/EXCs
                    combo = stats['perfect'] + stats['great'] + stats['good']
                else:
                    combo = -1  # Default to -1 to indicate combo isn't present for this score
                jubeat.update_score(userid, timestamp, songid, chart, score, medal, combo, ghost, stats, music_rate)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Import Score DB')
    parser.add_argument(
        '--series',
        action='store',
        type=str,
        required=True,
        help='The game series we are importing.',
    )
    parser.add_argument(
        '--tsv',
        dest='tsv',
        action='store',
        type=str,
        help='The TSV file to read, for applicable games.',
    )
    parser.add_argument(
        "--config",
        type=str,
        default="config.yaml",
        help="Core configuration for importing to DB. Defaults to 'config.yaml'.",
    )
    parser.add_argument(
        "--user",
        type=int,
        required=True,
        help="User id that we are importing scores for"
    )
    parser.add_argument(
        '--pcbid',
        type=str,
        required=True,
        help="Machine pcbid that we assign the scores to"
    )

    # Parse args, validate invariants.
    args = parser.parse_args()

    # Load the config so we can talk to the server
    config = yaml.safe_load(open(args.config))  # type: ignore
    config['database']['engine'] = Data.create_engine(config)
    config['machine'] = {'pcbid': args.pcbid}
    data = Data(config)
    if args.series == GameConstants.JUBEAT:
        model = Model('L44', 'J', 'F', 'A', 2019090300)
        jubeat = ImportJubeat()
        if args.tsv is not None:
            jubeat.import_scores(args.user, args.tsv, data, config, model)
        else:
            raise Exception(
                "No scores tsv provided"
            )
    else:
        raise Exception('Unsupported game series!')
