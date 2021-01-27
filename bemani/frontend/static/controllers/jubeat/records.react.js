/*** @jsx React.DOM */

var valid_sorts = ['series', 'name', 'popularity'];
var valid_charts = ['Basic', 'Advanced', 'Extreme', 'Hard Mode Basic', 'Hard Mode Advanced', 'Hard Mode Extreme'];
var valid_mixes = Object.keys(window.versions).map(function(mix) {
    return (parseInt(mix) - 1).toString();
});
var valid_subsorts = [valid_mixes, false, false, valid_charts, valid_charts];
if (window.showpersonalsort) {
    valid_sorts.push('grade');
    valid_sorts.push('clear');
}
var pagenav = new History(valid_sorts, valid_subsorts);
var sort_names = {
    'series': 'Series',
    'name': 'Song Name',
    'popularity': 'Popularity',
    'grade': 'Score',
    'clear': 'Clear Medal',
};

var HighScore = React.createClass({
    render: function() {
        if (!this.props.score) {
            return null;
        }

        return (
            <div className="score">
                <div>
                    <p>
                        <span className="bolder">Score:</span> {this.props.score.points}
                        <br/>
                        <span className="bolder">Combos:</span> {this.props.score.combo < 0 ? '-' : this.props.score.combo}
                        <br/>
                        <span className="bolder">Rate:</span> {this.props.score.music_rate < 0 ? '-' : this.props.score.music_rate}%
                        <br/>
                        <span className="status clearRate">{this.props.score.status}</span>
                    </p>
                </div>
                { this.props.score.userid && window.shownames ?
                    <div><a href={Link.get('player', this.props.score.userid)}>{
                        this.props.players[this.props.score.userid].name
                    }</a></div> : null
                }
            </div>
        );
    },
});

var network_records = React.createClass({

    sortRecords: function(records) {
        var sorted_records = {};

        records.forEach(function(record) {
            if (!(record.songid in sorted_records)) {
                sorted_records[record.songid] = {}
            }
            sorted_records[record.songid][record.chart] = record;
        });

        return sorted_records;
    },

    getInitialState: function(props) {
        return {
            songs: window.songs,
            records: this.sortRecords(window.records),
            players: window.players,
            versions: window.versions,
            sort: pagenav.getInitialState('series', '0'),
            subtab: this.getSubIndex('series', pagenav.getInitialSubState('series', '0')),
            offset: 0,
            limit: 10,
        };
    },

    getSubIndex: function(sort, subsort) {
        var subtab = 0;
        window.valid_sorts.forEach(function(potential, index) {
            if (window.valid_subsorts[index]) {
                window.valid_subsorts[index].forEach(function(subpotential, subindex) {
                    if (subpotential == subsort) {
                        subtab = subindex;
                    }
                }.bind(this));
            }
        }.bind(this));
        return subtab;
    },

    componentDidMount: function() {
        pagenav.onChange(function(sort, subsort) {
            var subtab = this.getSubIndex(sort, subsort);
            this.setState({sort: sort, offset: 0, subtab: subtab});
        }.bind(this));
        this.refreshRecords();
    },

    refreshRecords: function() {
        AJAX.get(
            Link.get('refresh'),
            function(response) {
                this.setState({
                    records: this.sortRecords(response.records),
                    players: response.players,
                });
                // Refresh every 15 seconds
                setTimeout(this.refreshRecords, 15000);
            }.bind(this)
        );
    },

    getPlays: function(record) {
        if (!record) { return 0; }
        var plays = 0;
        for (var i = 0; i < 7; i++) {
            if (record[i]) { plays += record[i].plays; }
        }
        return plays;
    },

    renderDifficulty: function(songid, chart) {
        if (this.state.songs[songid].difficulties[chart] == 0) {
            return <span className="difficulty">--</span>;
        } else {
            return <span className="difficulty">{this.state.songs[songid].difficulties[chart]}★</span>;
        }
    },

    renderBySeries: function() {
        var songids = Object.keys(this.state.songs).sort(function(a, b) {
            return parseInt(b) - parseInt(a);
        }.bind(this));
        if (window.filterempty) {
            songids = songids.filter(function(songid) {
                return this.getPlays(this.state.records[songid]) > 0;
            }.bind(this));
        }
        var lastSeries = 0;
        var lastSeries = 0;
        for (var i = 0; i < songids.length; i++) {
            var curSeries = Math.floor(songids[i] / 10000000);
            if (curSeries >= 10) {
                curSeries = 10; // Special case for jubeat qubell extend songs. 
            }
            if (curSeries != lastSeries) {
                lastSeries = curSeries;
                songids.splice(i, 0, curSeries);
            }
        }

        if (songids.length == 0) {
            return (
                <div>
                    No records to display!
                </div>
            );
        }

        var paginate = false;
        var curpage = -1;
        var curbutton = -1;
        if (songids.length > 99) {
            // Arbitrary limit for perf reasons
            paginate = true;
        }

        var items = songids.map(function(songid) {
            if (songid < 10000000) {
                curbutton = curbutton + 1;
                var subtab = curbutton;
                return {
                    songID: songid,
                    subtab: subtab,
                    version: versions[songid]
                }
            }
        }).filter(Boolean);
        var sortable_versions = items.map(function(e) { return e.version });

        return (
            <span>
                { paginate ?
                    <section>
                    <div>
                        <h4>Version - {sortable_versions[this.state.subtab]}</h4>
                        <p>
                            <SelectVersion
                                name="version"
                                value={ this.state.subtab }
                                versions={ sortable_versions }
                                onChange={function(version) {
                                    if (this.state.subtab == window.valid_mixes[version]) { return; }
                                    this.setState({subtab: version, offset: 0});
                                    pagenav.navigate(this.state.sort, window.valid_mixes[version]);
                                }.bind(this)}
                            />
                        </p>
                    </div>
                    </section>
                    :
                    null
                }
                <section>
                    <table className="list records">
                        <thead></thead>
                        <tbody>
                            {songids.map(function(songid) {
                                if (songid < 10000000) {
                                    // This is a series header
                                    curpage = curpage + 1;
                                    if (paginate && curpage != this.state.subtab) { return null; }

                                    return (
                                        <tr key={songid.toString()}>
                                            <td className="subheader"><b>{ this.state.versions[songid] }</b></td>
                                            <td className="subheader">Basic</td>
                                            <td className="subheader">Advanced</td>
                                            <td className="subheader">Extreme</td>
                                            <td className="subheader">Hard Mode Basic</td>
                                            <td className="subheader">Hard Mode Advanced</td>
                                            <td className="subheader">Hard Mode Extreme</td>
                                        </tr>
                                    );
                                } else {
                                    if (paginate && curpage != this.state.subtab) { return null; }

                                    var records = this.state.records[songid];
                                    if (!records) {
                                        records = {};
                                    }

                                    return (
                                        <tr key={songid.toString()}>
                                            <td className="center">
                                                <a href={Link.get('individual_score', songid)}>
                                                    <div className="songname">{ this.state.songs[songid].name }</div>
                                                    <div className="songartist">{ this.state.songs[songid].artist }</div>
                                                </a>
                                            <div className="songdifficulties">
                                                {this.renderDifficulty(songid, 0)}
                                                <span> / </span>
                                                {this.renderDifficulty(songid, 1)}
                                                <span> / </span>
                                                {this.renderDifficulty(songid, 2)}
                                                <span> / </span>
                                                {this.renderDifficulty(songid, 3)}
                                                <span> / </span>
                                                {this.renderDifficulty(songid, 4)}
                                                <span> / </span>
                                                {this.renderDifficulty(songid, 5)}
                                            </div>
                                            </td>
                                            <td>
                                                <HighScore
                                                    players={this.state.players}
                                                    songid={songid}
                                                    chart={0}
                                                    score={records[0]}
                                                />
                                            </td>
                                            <td>
                                                <HighScore
                                                    players={this.state.players}
                                                    songid={songid}
                                                    chart={1}
                                                    score={records[1]}
                                                />
                                            </td>
                                            <td>
                                                <HighScore
                                                    players={this.state.players}
                                                    songid={songid}
                                                    chart={2}
                                                    score={records[2]}
                                                />
                                            </td>
                                            <td>
                                                <HighScore
                                                    players={this.state.players}
                                                    songid={songid}
                                                    chart={3}
                                                    score={records[3]}
                                                />
                                            </td>
                                            <td>
                                                <HighScore
                                                    players={this.state.players}
                                                    songid={songid}
                                                    chart={4}
                                                    score={records[4]}
                                                />
                                            </td>
                                            <td>
                                                <HighScore
                                                    players={this.state.players}
                                                    songid={songid}
                                                    chart={5}
                                                    score={records[5]}
                                                />
                                            </td>
                                        </tr>
                                    );
                                }
                            }.bind(this))}
                        </tbody>
                    </table>
                </section>
            </span>
        );
    },

    renderByName: function() {
        var songids = Object.keys(this.state.songs).sort(function(a, b) {
            var an = this.state.songs[a].name;
            var bn = this.state.songs[b].name;
            var c = an.localeCompare(bn);
            if (c == 0) {
                return parseInt(a) - parseInt(b)
            } else {
                return c;
            }
        }.bind(this));
        if (window.filterempty) {
            songids = songids.filter(function(songid) {
                return this.getPlays(this.state.records[songid]) > 0;
            }.bind(this));
        }

        return this.renderBySongIDList(songids, false);
    },

    renderByPopularity: function() {
        var songids = Object.keys(this.state.songs).sort(function(a, b) {
            var ap = this.getPlays(this.state.records[a]);
            var bp = this.getPlays(this.state.records[b]);
            if (bp == ap) {
                return parseInt(a) - parseInt(b)
            } else {
                return bp - ap;
            }
        }.bind(this));
        if (window.filterempty) {
            songids = songids.filter(function(songid) {
                return this.getPlays(this.state.records[songid]) > 0;
            }.bind(this));
        }

        return this.renderBySongIDList(songids, true);
    },

    renderByScore: function() {
        var songids = Object.keys(this.state.songs).sort(function(a, b) {
            // Grab records for this song
            var ar = this.state.records[a];
            var br = this.state.records[b];
            var ac = null;
            var bc = null;
            var as = 0;
            var bs = 0;

            // Fill in record for current chart only if it exists
            if (ar) { ac = ar[this.state.subtab]; }
            if (br) { bc = br[this.state.subtab]; }
            if (ac) { as = ac.points; }
            if (bc) { bs = bc.points; }

            if (bs == as) {
                return parseInt(a) - parseInt(b);
            } else {
                return bs - as;
            }
        }.bind(this));
        if (window.filterempty) {
            songids = songids.filter(function(songid) {
                return this.getPlays(this.state.records[songid]) > 0;
            }.bind(this));
        }

        return (
            <section>
                <h4>Difficulty - {window.valid_charts[this.state.subtab]}</h4>
                <p>
                    <SelectVersion
                        name="chart"
                        value={ this.state.subtab }
                        versions={ window.valid_charts }
                        onChange={function(chart) {
                            if (this.state.subtab == window.valid_charts[chart]) { return; }
                            this.setState({subtab: chart, offset: 0});
                            pagenav.navigate(this.state.sort, window.valid_charts[chart]);
                        }.bind(this)}
                    />
                </p>
                { this.renderBySongIDList(songids, false) }
            </section>
        );
    },

    renderByClearMedal: function() {
        var songids = Object.keys(this.state.songs).sort(function(a, b) {
            // Grab records for this song
            var ar = this.state.records[a];
            var br = this.state.records[b];
            var ac = null;
            var bc = null;
            var al = 0;
            var bl = 0;

            // Fill in record for current chart only if it exists
            if (ar) { ac = ar[this.state.subtab]; }
            if (br) { bc = br[this.state.subtab]; }
            if (ac) { al = ac.medal; }
            if (bc) { bl = bc.medal; }

            if (al == bl) {
                return parseInt(a) - parseInt(b)
            } else {
                return bl - al;
            }
        }.bind(this));
        if (window.filterempty) {
            songids = songids.filter(function(songid) {
                return this.getPlays(this.state.records[songid]) > 0;
            }.bind(this));
        }

        return (
            <section>
                <h4>Difficulty - {window.valid_charts[this.state.subtab]}</h4>
                <p>
                    <SelectVersion
                        name="chart"
                        value={ this.state.subtab }
                        versions={ window.valid_charts }
                        onChange={function(chart) {
                            if (this.state.subtab == window.valid_charts[chart]) { return; }
                            this.setState({subtab: chart, offset: 0});
                            pagenav.navigate(this.state.sort, window.valid_charts[chart]);
                        }.bind(this)}
                    />
                </p>
                { this.renderBySongIDList(songids, false) }
            </section>
        );
    },


    renderBySongIDList: function(songids, showplays) {
        return (
            <table className="list records">
                <thead>
                    <tr>
                        <th className="subheader">Song</th>
                        <th className="subheader">Basic</th>
                        <th className="subheader">Advanced</th>
                        <th className="subheader">Extreme</th>
                        <th className="subheader">Hard Mode Basic</th>
                        <th className="subheader">Hard Mode Advanced</th>
                        <th className="subheader">Hard Mode Extreme</th>
                    </tr>
                </thead>
                <tbody>
                    {songids.map(function(songid, index) {
                        if (index < this.state.offset || index >= this.state.offset + this.state.limit) {
                            return null;
                        }

                        var records = this.state.records[songid];
                        if (!records) {
                            records = {};
                        }

                        var plays = this.getPlays(records);
                        var difficulties = this.state.songs[songid].difficulties;
                        return (
                            <tr key={songid.toString()}>
                                <td className="center">
                                    <div>
                                        <a href={Link.get('individual_score', songid)}>
                                            <div className="songname">{ this.state.songs[songid].name }</div>
                                            <div className="songartist">{ this.state.songs[songid].artist }</div>
                                        </a>
                                    </div>
                                    <div className="songdifficulties">
                                        {this.renderDifficulty(songid, 0)}
                                        <span> / </span>
                                        {this.renderDifficulty(songid, 1)}
                                        <span> / </span>
                                        {this.renderDifficulty(songid, 2)}
                                        <span> / </span>
                                        {this.renderDifficulty(songid, 3)}
                                        <span> / </span>
                                        {this.renderDifficulty(songid, 4)}
                                        <span> / </span>
                                        {this.renderDifficulty(songid, 5)}
                                    </div>
                                    { showplays ? <div className="songplays">#{index + 1} - {plays}{plays == 1 ? ' play' : ' plays'}</div> : null }
                                </td>
                                <td>
                                    <HighScore
                                        players={this.state.players}
                                        songid={songid}
                                        chart={0}
                                        score={records[0]}
                                    />
                                </td>
                                <td>
                                    <HighScore
                                        players={this.state.players}
                                        songid={songid}
                                        chart={1}
                                        score={records[1]}
                                    />
                                </td>
                                <td>
                                    <HighScore
                                        players={this.state.players}
                                        songid={songid}
                                        chart={2}
                                        score={records[2]}
                                    />
                                </td>
                                <td>
                                    <HighScore
                                        players={this.state.players}
                                        songid={songid}
                                        chart={3}
                                        score={records[3]}
                                    />
                                </td>
                                <td>
                                    <HighScore
                                        players={this.state.players}
                                        songid={songid}
                                        chart={4}
                                        score={records[4]}
                                    />
                                </td>
                                <td>
                                    <HighScore
                                        players={this.state.players}
                                        songid={songid}
                                        chart={5}
                                        score={records[5]}
                                    />
                                </td>
                            </tr>
                        );
                    }.bind(this))}
                </tbody>
                <tfoot>
                    <tr>
                        <td colSpan={7}>
                            { this.state.offset > 0 ?
                                <Prev onClick={function(event) {
                                     var page = this.state.offset - this.state.limit;
                                     if (page < 0) { page = 0; }
                                     this.setState({offset: page});
                                }.bind(this)}/> : null
                            }
                            { (this.state.offset + this.state.limit) < songids.length ?
                                <Next style={ {float: 'right'} } onClick={function(event) {
                                     var page = this.state.offset + this.state.limit;
                                     if (page >= songids.length) { return }
                                     this.setState({offset: page});
                                }.bind(this)}/> :
                                null
                            }
                        </td>
                    </tr>
                </tfoot>
            </table>
        );
    },

    render: function() {
        var data = null;
        if (this.state.sort == 'series') {
            data = this.renderBySeries();
        } else if (this.state.sort == 'popularity') {
            data = this.renderByPopularity();
        } else if (this.state.sort == 'name') {
            data = this.renderByName();
        } else if (this.state.sort == 'grade') {
            data = this.renderByScore();
        } else if (this.state.sort == 'clear') {
            data = this.renderByClearMedal();
        }

        return (
            <div>
                <section>
                    <p>
                        <h4>Sort Options</h4>
                        <SelectVersion
                            name="sortOptions"
                            value={ this.state.sort }
                            versions={ sort_names }
                            onChange={function(event) {
                                if (this.state.sort == event) { return; }
                                this.setState({sort: event, offset: 0, subtab: 0});
                                pagenav.navigate(event, window.valid_subsorts[valid_sorts.indexOf(event)][0]);
                            }.bind(this)}
                        />
                    </p>
                </section>
                <section>
                    {data}
                </section>
            </div>
        );
    },
});

ReactDOM.render(
    React.createElement(network_records, null),
    document.getElementById('content')
);
