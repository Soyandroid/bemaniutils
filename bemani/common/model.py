from typing import Optional


class Model:
    """
    Object representing a parsed Model String.
    """

    def __init__(self, game: str, dest: str, spec: str, rev: str, version: Optional[int]) -> None:
        """
        Initialize a Model object.

        Parameters:
            game - Game code (such as LDJ)
            dest - Destination region for the game (such as J)
            spec - Spec for the game (such as A)
            rev - Revision of the game (such as A)
            version - Integer representing version, usually in the form of YYYYMMDDXX where
                      YYYY is a year, MM is a month, DD is a day and XX is sub-day versioning.
        """
        self.game = game
        self.dest = dest
        self.spec = spec
        self.rev = rev
        self.version = version

    @staticmethod
    def from_modelstring(model: str) -> 'Model':
        """
        Parse a modelstring and return a Model

        Parameters:
            model - Modelstring in a form similar to "K39:J:B:A:2010122200". Note that
                    The last part (version number) may be left off.

        Returns:
            A Model object.
        """
        parts = model.split(':')
        if len(parts) == 5:
            game, dest, spec, rev, version = parts
            if version == "DJHACKERS":  # Fucking old crack
                version = 0
            return Model(game, dest, spec, rev, int(version))
        elif len(parts) == 4:
            game, dest, spec, rev = parts
            return Model(game, dest, spec, rev, None)
        raise Exception(f'Couldn\'t parse model {model}')

    def __str__(self) -> str:
        if self.version is None:
            return f'{self.game}:{self.dest}:{self.spec}:{self.rev}'
        else:
            return f'{self.game}:{self.dest}:{self.spec}:{self.rev}:{self.version}'
