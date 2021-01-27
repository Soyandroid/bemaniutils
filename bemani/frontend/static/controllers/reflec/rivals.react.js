/*** @jsx React.DOM */

var valid_versions = Object.keys(window.rivals);
var pagenav = new History(valid_versions);

var rivals_view = React.createClass({

    getInitialState: function(props) {
        var profiles = Object.keys(window.rivals);
        var version = pagenav.getInitialState(profiles[profiles.length - 1]);
        return {
            rivals: window.rivals,
            players: window.players,
            profiles: profiles,
            version: version,
            term_id: "",
            term_name: "",
            results: {},
            searching_id: false,
            searching_name: false,
            offset: 0,
            limit: 5,
        };
    },

    componentDidMount: function() {
        pagenav.onChange(function(version) {
            this.setState({version: version, offset: 0});
        }.bind(this));
        this.refreshRivals();
    },

    refreshRivals: function() {
        AJAX.get(
            Link.get('refresh'),
            function(response) {
                this.setState({
                    rivals: response.rivals,
                    players: response.players,
                });
				setTimeout(this.refreshRivals, 5000);
            }.bind(this)
        );
    },

    searchForPlayersID: function(event) {
        this.setState({searching_id: true});
        AJAX.post(
            Link.get('search'),
            {
                version: this.state.version,
                term: this.state.term_id,
            },
            function(response) {
                this.setState({
                    results: response.results,
                    searching_id: false,
                });
            }.bind(this)
        );
        event.preventDefault();
    },

    searchForPlayersName: function(event) {
        this.setState({searching_name: true});
        AJAX.post(
            Link.get('search'),
            {
                version: this.state.version,
                term: this.state.term_name,
            },
            function(response) {
                this.setState({
                    results: response.results,
                    searching_name: false,
                });
            }.bind(this)
        );
        event.preventDefault();
    },

    addRival: function(event, userid) {
        AJAX.post(
            Link.get('addrival'),
            {
                version: this.state.version,
                userid: userid,
            },
            function(response) {
                this.setState({
                    rivals: response.rivals,
                    players: response.players,
                });
            }.bind(this)
        );
        event.preventDefault();
    },

    removeRival: function(event, userid) {
        AJAX.post(
            Link.get('removerival'),
            {
                version: this.state.version,
                userid: userid,
            },
            function(response) {
                this.setState({
                    rivals: response.rivals,
                    players: response.players,
                });
            }.bind(this)
        );
        event.preventDefault();
    },

    addRivals: function(userid) {
        if (userid == window.userid) {
            return null;
        }

        var avail = true;
        var count = 0;
        var current_rivals = this.state.rivals[this.state.version];
        for (var i = 0; i < current_rivals.length; i++) {
            count++;
            if (current_rivals[i].userid == userid) {
                avail = false;
            }
        }

        if (count >= 30) { avail = false; }

        return (
            <span>
                {avail ?
                    <Add
                        title="Add Rival"
                        onClick={function(event) {
                            this.addRival(event, userid);
                        }.bind(this)}
                    /> :
                    null
                }
            </span>
        );
    },

    render: function() {
        if (this.state.rivals[this.state.version]) {
            var rivals = this.state.rivals[this.state.version];
            var resultlength = 0;
            Object.keys(this.state.results).map(function(userid, index) {
                var player = this.state.results[userid][this.state.version];
                if (player) { resultlength++; }
            }.bind(this));
            var filteredVersion = Object.values(this.state.profiles).map(function(version) {
                console.log(version - 2)
                return Object.values(window.versions)[version - 2]
            });
            var item = Object.keys(window.versions).map(function(k){
                return window.versions[k]
            })
            return (
                <div>
                    <section>
                        <h4>Select Version</h4>
                        <p>
                            <SelectVersion
                                name="version"
                                value={ filteredVersion.indexOf(item[this.state.version - 2]) }
                                versions={ filteredVersion }
                                onChange={function(event) {
                                    var version = item.indexOf(filteredVersion[event]) + 2
                                    console.log(`onChange version ${version}`)
                                    if (this.state.version == version) { return; }
                                    this.setState({
                                        version: version,
                                        offset: 0,
                                    });
                                    pagenav.navigate(version);
                                }.bind(this)}
                            />
                        </p>
                        <h3>Rivals</h3>
                    </section>
                    <section>
                        <h4>Search Rival</h4>
                        <form onSubmit={this.searchForPlayersName}>
                            <div className="fields">
                                <div className="field half">
                                    <input
                                    type="text"
                                    className="inline"
                                    maxlength="8"
                                    placeholder="Player name"
                                    value={this.state.term_name}
                                    onChange={function(event) {
                                        var rawvalue = event.target.value;
                                        if (this.state.version <= 3) {
                                            // Only allow uppercase, so convert to be helpful
                                            rawvalue = rawvalue.toUpperCase();
                                        }
                                        var value = "";
                                        // Nasty conversion to change typing into wide text
                                        for (var i = 0; i < rawvalue.length; i++) {
                                            var c = rawvalue.charCodeAt(i);
                                            if (c >= '0'.charCodeAt(0) && c <= '9'.charCodeAt(0)) {
                                                c = 0xFF10 + (c - '0'.charCodeAt(0));
                                            } else if(c >= 'A'.charCodeAt(0) && c <= 'Z'.charCodeAt(0)) {
                                                c = 0xFF21 + (c - 'A'.charCodeAt(0));
                                            } else if(c >= 'a'.charCodeAt(0) && c <= 'z'.charCodeAt(0)) {
                                                c = 0xFF41 + (c - 'a'.charCodeAt(0));
                                            } else if(c == '.'.charCodeAt(0)) {
                                                c = 0xFF0E;
                                            } else if(c == '-'.charCodeAt(0)) {
                                                c = 0x2212;
                                            } else if(c == '_'.charCodeAt(0)) {
                                                c = 0xFF3F;
                                            } else if(c == '&'.charCodeAt(0)) {
                                                c = 0xFF06;
                                            } else if(c == '!'.charCodeAt(0)) {
                                                c = 0xFF01;
                                            } else if(c == '?'.charCodeAt(0)) {
                                                c = 0xFF1F;
                                            } else if(c == '/'.charCodeAt(0)) {
                                                c = 0xFF0F;
                                            } else if(c == '*'.charCodeAt(0)) {
                                                c = 0xFF0A;
                                            } else if(c == '#'.charCodeAt(0)) {
                                                c = 0xFF03;
                                            } else if(c == '@'.charCodeAt(0)) {
                                                c = 0xFF20;
                                            } else if(c == '('.charCodeAt(0)) {
                                                c = 0xFF08;
                                            } else if(c == ')'.charCodeAt(0)) {
                                                c = 0xFF09;
                                            } else if(c == '^'.charCodeAt(0)) {
                                                c = 0xFF3E;
                                            } else if(c == '%'.charCodeAt(0)) {
                                                c = 0xFF05;
                                            } else if(c == ' '.charCodeAt(0)) {
                                                c = 0x3000;
                                            }
                                            value = value + String.fromCharCode(c);
                                        }
                                        var nameRegex;
                                        if (this.state.version <= 3) {
                                            nameRegex = new RegExp(
                                                "^[" +
                                                "\uFF21-\uFF3A" +
                                                "\uFF10-\uFF19" +
                                                "\uFF0E\u2212\uFF3F\u30FB" +
                                                "\uFF06\uFF01\uFF1F\uFF0F" +
                                                "\uFF0A\uFF03\u266D\u2605" +
                                                "\uFF20\u266A\u2193\u2191" +
                                                "\u2192\u2190\uFF08\uFF09" +
                                                "\u221E\u25C6\u25CF\u25BC" +
                                                "\uFFE5\uFF3E\u2200\uFF05" +
                                                "\u3000" +
                                                "]*$"
                                            );
                                        } else {
                                            nameRegex = new RegExp(
                                                "^[" +
                                                "\uFF21-\uFF3A" +
                                                "\uFF41-\uFF5A" +
                                                "\uFF10-\uFF19" +
                                                "\uFF0E\u2212\uFF3F\u30FB" +
                                                "\uFF06\uFF01\uFF1F\uFF0F" +
                                                "\uFF0A\uFF03\u266D\u2605" +
                                                "\uFF20\u266A\u2193\u2191" +
                                                "\u2192\u2190\uFF08\uFF09" +
                                                "\u221E\u25C6\u25CF\u25BC" +
                                                "\uFFE5\uFF3E\u2200\uFF05" +
                                                "\u3000" +
                                                "]*$"
                                            );
                                        }
                                        if (value.length <= 8 && nameRegex.test(value)) {
                                            this.setState({term_name: value});
                                        }
                                    }.bind(this)}
                                    name="search"
                                />
                                </div>
                                <div className="field half">
                                    <input type="submit" value="search" />
                                    { this.state.searching_name ?
                                        <img className="loading" src={Link.get('static', 'loading-16.gif')} /> :
                                        null
                                    }
                                </div>
                            </div>
                        </form>

                        <form onSubmit={this.searchForPlayersID}>
                            <div className="fields">
                                <div className="field half">
                                    <input
                                        type="text"
                                        className="inline"
                                        placeholder="Reflect beat ID"
                                        maxlength="9"
                                        value={this.state.term_id}
                                        onChange={function(event) {
                                            var value = event.target.value.toUpperCase();
                                            var intRegex = new RegExp(
                                                "^[" +
                                                "0-9" +
                                                "-" +
                                                "]*$"
                                            );
                                            if (value.length <= 9 && intRegex.test(value)) {
                                                this.setState({term_id: value});
                                            }
                                        }.bind(this)}
                                        name="search"
                                    />
                                </div>
                                <div className="field half">
                                    <input type="submit" value="search" />
                                    { this.state.searching_id ?
                                        <img className="loading" src={Link.get('static', 'loading-16.gif')} /> :
                                        null
                                    }
                                </div>
                            </div>
                        </form>
                        {resultlength > 0 ?
                            <table className="list players">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Reflec Beat ID</th>
                                        <th className="action"></th>
                                    </tr>
                                </thead>
                                <tbody>{
                                    Object.keys(this.state.results).map(function(userid, index) {
                                        if (index < this.state.offset || index >= this.state.offset + this.state.limit) {
                                            return null;
                                        }
                                        var player = this.state.results[userid][this.state.version];
                                        if (!player) { return null; }

                                        return (
                                            <tr>
                                                <td><Rival userid={userid} player={player} /></td>
                                                <td>{ player.extid }</td>
                                                <td className="edit">{this.addRivals(userid)}</td>
                                            </tr>
                                        );
                                    }.bind(this))
                                }</tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan={2}>
                                            { this.state.offset > 0 ?
                                                <Prev onClick={function(event) {
                                                     var page = this.state.offset - this.state.limit;
                                                     if (page < 0) { page = 0; }
                                                     this.setState({offset: page});
                                                }.bind(this)}/> : null
                                            }
                                            { (this.state.offset + this.state.limit) < resultlength ?
                                                <Next style={ {float: 'right'} } onClick={function(event) {
                                                     var page = this.state.offset + this.state.limit;
                                                     if (page >= resultlength) { return; }
                                                     this.setState({offset: page});
                                                }.bind(this)}/> : null
                                            }
                                        </td>
                                    </tr>
                                </tfoot>
                            </table> :
                            <p>No players match the specified search.</p>
                        }
                    </section>
                    <section>
                        <h3>Rivals</h3>
                        <table className="list players">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Reflec Beat ID</th>
                                    <th className="action"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {this.state.rivals[this.state.version].map(function(rival, index) {
                                    var player = this.state.players[rival.userid][this.state.version];
                                    return (
                                        <tr>
                                            <td><Rival userid={rival.userid} player={player} /></td>
                                            <td>{ player.extid }</td>
                                            <td className="edit">
                                                <Delete
                                                    title="Remove Rival"
                                                    onClick={function(event) {
                                                        this.removeRival(event, rival.userid);
                                                    }.bind(this)}
                                                />
                                            </td>
                                        </tr>
                                    );
                                }.bind(this))}
                            </tbody>
                        </table>
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
                        <p>You have no profile for {window.versions[this.state.version]}!</p>
                    </section>
                </div>
            );
        }
    },
});

ReactDOM.render(
    React.createElement(rivals_view, null),
    document.getElementById('content')
);
