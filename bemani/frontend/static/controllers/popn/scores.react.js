/*** @jsx React.DOM */

var network_scores = React.createClass({
    getInitialState: function(props) {
        return {
            songs: window.songs,
            attempts: window.attempts,
            players: window.players,
            loading: true,
            offset: 0,
            limit: 10,
        };
    },

    componentDidMount: function() {
        this.refreshScores();
    },

    refreshScores: function() {
        AJAX.get(
            Link.get('refresh'),
            function(response) {
                this.setState({
                    attempts: response.attempts,
                    players: response.players,
                    loading: false,
                });
                // Refresh every 15 seconds
                setTimeout(this.refreshScores, 15000);
            }.bind(this)
        );
    },

    convertChart: function(chart) {
        switch(chart) {
            case 0:
                return 'Easy';
            case 1:
                return 'Normal';
            case 2:
                return 'Hyper';
            case 3:
                return 'EX';
            default:
                return 'u broke it';
        }
    },

    renderScore: function(score) {
        return (
            <div className="score">
                <div>
                    <p>
                        <span className="bolder">Score:</span> {score.points}
                        <br/>
                        <span className="bolder">Combos:</span> {score.combo < 0 ? '-' : score.combo}
                        <br/>
                        <span className="status clearRate">{score.status}</span>
                    </p>
                </div>
            </div>
        );
    },

    render: function() {
        return (
            <div>
                <table className="list attempts">
                    <thead>
                        <tr>
                            { window.shownames ? <th>Name</th> : null }
                            <th>Timestamp</th>
                            <th>Song</th>
                            <th>Chart</th>
                            <th>Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        {this.state.attempts.map(function(attempt, index) {
                            if (index < this.state.offset || index >= this.state.offset + this.state.limit) {
                                return null;
                            }

                            return (
                                <tr>
                                    { window.shownames ? <td><a href={Link.get('player', attempt.userid)}>{
                                        this.state.players[attempt.userid].name
                                    }</a></td> : null }
                                    <td>
                                        <div>
                                            <Timestamp timestamp={attempt.timestamp} />
                                            { window.shownewrecords && attempt.raised ?
                                                <span className="bolder">New High Score!</span> :
                                                null
                                            }
                                        </div>
                                    </td>
                                    <td className="center">
                                        <a href={Link.get('individual_score', attempt.songid)}>
                                            <div className="songname">{ this.state.songs[attempt.songid].name }</div>
                                            <div className="songartist">{ this.state.songs[attempt.songid].artist }</div>
                                            <div className="songgenre">{ this.state.songs[attempt.songid].genre }</div>
                                        </a>
                                    </td>
                                    <td className="center">
                                        <div>
                                            <a href={Link.get('individual_score', attempt.songid, this.convertChart(attempt.chart))}>{
                                                this.convertChart(attempt.chart)
                                            }</a>
                                        </div>
                                        <div>{
                                            this.state.songs[attempt.songid].difficulties[attempt.chart]
                                        }</div>
                                    </td>
                                    <td>{ this.renderScore(attempt) }</td>
                                </tr>
                            );
                        }.bind(this))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={5}>
                                { this.state.offset > 0 ?
                                    <Prev onClick={function(event) {
                                         var page = this.state.offset - this.state.limit;
                                         if (page < 0) { page = 0; }
                                         this.setState({offset: page});
                                    }.bind(this)}/> : null
                                }
                                { (this.state.offset + this.state.limit) < this.state.attempts.length ?
                                    <Next style={ {float: 'right'} } onClick={function(event) {
                                         var page = this.state.offset + this.state.limit;
                                         if (page >= this.state.attempts.length) { return }
                                         this.setState({offset: page});
                                    }.bind(this)}/> :
                                    this.state.loading ?
                                        <span className="loading" style={ {float: 'right' } }>
                                            <img
                                                className="loading"
                                                src={Link.get('static', 'loading-16.gif')}
                                            /> loading more scores...
                                        </span> : null
                                }
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        );
    },
});

ReactDOM.render(
    React.createElement(network_scores, null),
    document.getElementById('content')
);
