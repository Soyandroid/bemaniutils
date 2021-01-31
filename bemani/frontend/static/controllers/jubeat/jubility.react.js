/*** @jsx React.DOM */

var valid_versions = Object.keys(window.versions);
var pagenav = new History(valid_versions);

var jubility_view = React.createClass({

    getInitialState: function(props) {
        var profiles = Object.keys(window.player);
        return {
            player: window.player,
            songs: window.songs,
            profiles: profiles,
            version: pagenav.getInitialState(profiles[profiles.length - 1]),
        };
    },

    componentDidMount: function() {
        pagenav.onChange(function(version) {
            this.setState({version: version});
        }.bind(this));
        this.refreshProfile();
    },

    refreshProfile: function() {
        AJAX.get(
            Link.get('refresh'),
            function(response) {
                var profiles = Object.keys(response.player);

                this.setState({
                    player: response.player,
                    profiles: profiles,
                });
                setTimeout(this.refreshProfile, 5000);
            }.bind(this)
        );
    },

    getJubilitySongids: function(jubilityChart) {
        if (!jubilityChart) { return []; }
        return jubilityChart.map(function(chart) {
            return chart.music_id
        })
    },

    getJubilityEntry: function(jubilityChart, songid) {
        return jubilityChart.filter(function(chart) {
            return chart.music_id == songid
        }).shift();
    },

    renderJubilityBreakdown: function(player) {
        return (
            <div className="row">
                {this.renderJubilityTable(player, true)}
                {this.renderJubilityTable(player, false)}
            </div>
        );
    },

    renderJubilityTable: function(player, pickup) {
        if (this.state.version != 13)
            return null;
        if(pickup == true)
            jubilityChart = player.pick_up_chart;
        else
            jubilityChart = player.common_chart;
        var songids = this.getJubilitySongids(jubilityChart);
        if (typeof songids === 'undefined' || songids.length == 0) {
            return null;
        }
        return(
            <div className="col-6 col-12-medium">
                <p>
                    <b>
                    {pickup == true ? <b>Pick up chart breakdown</b> : <b>Common chart breakdown</b>}
                    </b>
                </p>
                <table>
                    <thead>
                        <th>Song</th>
                        <th>Music Rate</th>
                        <th>Jubility</th>
                    </thead>
                    <tbody>
                        {songids.map(function(songid) {
                            jubilityEntry = this.getJubilityEntry(jubilityChart, songid)
                            return (
                                <tr key={songid.toString()}>
                                    <td>
                                        <a href={Link.get('individual_score', songid)}>
                                            <div>{ this.state.songs[songid].name }</div>
                                        </a>
                                    </td>
                                    <td>
                                        {jubilityEntry.music_rate.toFixed(1)}%
                                    </td>
                                    <td>
                                        {jubilityEntry.value.toFixed(1)}
                                    </td>
                                </tr>
                            );
                        }.bind(this))}
                    </tbody>
                </table>
            </div>
        );
    },

    renderJubility: function(player) {
        return(
            // version == prop ( No Jubility )
            this.state.version == 10 ?
            <div>
                <p>This version of jubeat doesn't support Jubility</p>
            </div>
            :
            // version == qubell ( No Jubility )
            this.state.version == 11 ?
            <div>
                <p>This version of jubeat doesn't support Jubility</p>
            </div>
            :
            // version == festo
            this.state.version == 13 ? 
                <div>
                    <LabelledSection label="Jubility">
                    {(player.common_jubility+player.pick_up_jubility).toFixed(1)}
                    </LabelledSection>
                    <LabelledSection label="Common Jubility">
                        {player.common_jubility.toFixed(1)}
                    </LabelledSection>
                    <LabelledSection label="Pick up Jubility">
                        {player.pick_up_jubility.toFixed(1)}
                    </LabelledSection>
                </div>
            :
            // Default which version >= Saucer except qubell and festo
            this.state.version >= 8 ? 
                <div>
                    <LabelledSection label="Jubility">
                    {player.jubility / 100}
                    </LabelledSection>
                </div>
            :
            <div>
                <p>This version of jubeat doesn't support Jubility</p>
            </div>
        )
    },

    render: function() {
        if (this.state.player[this.state.version]) {
            var player = this.state.player[this.state.version];
            var filteredVersion = Object.values(this.state.profiles).map(function(version) {
                return Object.values(window.versions)[version-1]
            });
            var item = Object.keys(window.versions).map(function(k){
                return window.versions[k]
            })
            return (
                <div>
                    <section>
                        <p>
                            <b>
                                <a href={Link.get('profile')}>&larr; Back To Profile</a>
                            </b>
                        </p>
                    </section>
                    <section>
                        <h3>{player.name}'s jubility</h3>
                        <p>
                            <SelectVersion
                                name="version"
                                value={ filteredVersion.indexOf(item[this.state.version - 1]) }
                                versions={ filteredVersion }
                                onChange={function(event) {
                                    var version = item.indexOf(filteredVersion[event]) + 1
                                    if (this.state.editing_name) { return; }
                                    if (this.state.version == version) { return; }
                                    this.setState({
                                        version: version,
                                        new_name: this.state.player[version].name,
                                    });
                                    pagenav.navigate(version);
                                }.bind(this)}
                            />
                        </p>
                    </section>
                    <section>
                        {this.renderJubility(player)}
                    </section>
                    <section>
                        {this.renderJubilityBreakdown(player)}
                    </section>
                </div>
            );
        } else {
            var item = Object.keys(window.versions).map(function(k){
                return window.versions[k]
            })
            return (
                <div>
                    <section>
                        <p>
                            <SelectVersion
                                name="version"
                                value={ item.indexOf(item[this.state.version - 1]) }
                                versions={ item }
                                onChange={function(event) {
                                    var version = item.indexOf(item[event]) + 1
                                    if (this.state.version == version) { return; }
                                    this.setState({version: version});
                                    pagenav.navigate(version);
                                }.bind(this)}
                            />
                        </p>
                    </section>
                    <section>
                        <p>This player has no profile for {window.versions[this.state.version]}!</p>
                    </section>
                </div>
            );
        }
    },
});

ReactDOM.render(
    React.createElement(jubility_view, null),
    document.getElementById('content')
);
