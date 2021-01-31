/*** @jsx React.DOM */

var valid_versions = Object.keys(window.versions);
var pagenav = new History(valid_versions);

var profile_view = React.createClass({

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
        var songids = [];
        for (var i = 0; i < 30; i++) {
            songids.push(jubilityChart[i]['music_id']);
        }
        return songids;
    },

    getJubilityEntry: function(jubilityChart, songid) {
        for (var i = 0; i < 30; i++) {
            if(jubilityChart[i]['music_id'] == songid)
                return jubilityChart[i];
        }
    },

    renderJubilityBreakdown: function(player, pickup) {
        if (this.state.version != 13)
            return null;
        if(pickup == true)
            jubilityChart = player.pick_up_chart;
        else
            jubilityChart = player.common_chart;
        var songids = this.getJubilitySongids(jubilityChart);
        if (songids.length == 0) {
            return null;
        }
        return (
            <span>
                <section>
                    <table className="jubility breakdown">
                        <thead>
                            <th className="subheader">Song</th>
                            <th className="subheader">Music Rate</th>
                            <th className="subheader">Jubility</th>
                        </thead>
                        <tbody>
                            {songids.map(function(songid) {
                                jubilityEntry = this.getJubilityEntry(jubilityChart, songid)
                                return (
                                    <tr key={songid.toString()}>
                                        <td className="center">
                                            <a href={Link.get('individual_score', songid)}>
                                                <div className="songname">{ this.state.songs[songid].name }</div>
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
                </section>
            </span>
        );
    },

    renderJubility: function(player) {
        return(
            // version == qubell ( No Jubility )
            this.state.version == 11 ?
            null
            :
            // version == prop ( No Jubility )
            this.state.version == 10 ?
            null
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
            null
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
                        <h3>{player.name}'s profile</h3>
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
                        <div>
                            <LabelledSection label="User ID">{player.extid}</LabelledSection>
                            <LabelledSection label="Register Time">
                                <Timestamp timestamp={player.first_play_time}/>
                            </LabelledSection>
                            <LabelledSection label="Last Play Time">
                                <Timestamp timestamp={player.last_play_time}/>
                            </LabelledSection>
                            <LabelledSection label="Total Plays">
                                {player.plays}回
                            </LabelledSection>
                            <LabelledSection label="EXCELLENTs">
                                {player.ex_count}回
                            </LabelledSection>
                            <LabelledSection label="FULL COMBOs">
                                {player.fc_count}回
                            </LabelledSection>
                        </div>
                        {this.renderJubility(player)}
                        <LabelledSection label="Pick-up jubility">
                            {this.renderJubilityBreakdown(player, true)}
                        </LabelledSection>
                        <LabelledSection label="Common jubility">
                            {this.renderJubilityBreakdown(player, false)}
                        </LabelledSection>
                    </section>
                    <section>
                        <a className="button small primary" href={Link.get('records')}>{ window.own_profile ?
                            <span>view your records</span> :
                            <span>view {player.name}'s records</span>
                        }</a>
                        <span>&#9;</span>
                        <a className="button small" href={Link.get('scores')}>{ window.own_profile ?
                            <span>view all your scores</span> :
                            <span>view all {player.name}'s scores</span>
                        }</a>
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
    React.createElement(profile_view, null),
    document.getElementById('content')
);
