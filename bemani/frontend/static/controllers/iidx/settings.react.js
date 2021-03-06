/*** @jsx React.DOM */

var valid_versions = Object.keys(window.versions);
var pagenav = new History(valid_versions);

var menu_option_names = {
    'alphabet': 'alphabet folders',
    'difficulty': 'difficulty folders',
    'disable_song_preview': 'disable song previews',
    'effector_lock': 'lock effector',
    'grade': 'grade folders',
    'hide_play_count': 'hide play count on profile',
    'rival_info': 'rival info box',
    'rival_played': 'rival played folders',
    'rival_win_lose': 'rival win/lose folders',
    'status': 'status folders',
};
var valid_menu_options = [
    'grade',
    'status',
    'difficulty',
    'alphabet',
    'rival_played',
    'rival_win_lose',
    'rival_info',
    'hide_play_count',
    'disable_song_preview',
    'effector_lock',
];
var theme_option_names = {
    'beam': 'Note Beam',
    'bgm': 'Menu BGM',
    'burst': 'Note Burst',
    'frame': 'Frame',
    'full_combo': 'Full Combo Effect',
    'judge': 'Judge Font',
    'noteskin': 'Note Skin',
    'towel': 'Lane Cover',
    'turntable': 'Turntable Decal',
    'voice': 'Menu Announcer Voice',
    'pacemaker': 'Pacemaker Skin',
    'effector_preset': 'Effector Preset',
};
var valid_qpro_options = [
    'body',
    'face',
    'hair',
    'hand',
    'head',
];

var valid_qpro_options = [
    'body',
    'face',
    'hair',
    'hand',
    'head',
]

var settings_view = React.createClass({

    getInitialState: function(props) {
        var profiles = Object.keys(window.player);
        var version = pagenav.getInitialState(profiles[profiles.length - 1]);
        return {
            player: window.player,
            profiles: profiles,
            version: version,
            menu_changed: {},
            theme_changed: {},
            qpro_changed: {},
            menu_saving: {},
            theme_saving: {},
            qpro_saving: {},
            menu_saved: {},
            theme_saved: {},
            qpro_saved: {},
            new_name: window.player[version].name,
            editing_name: false,
            new_prefecture: window.player[version].prefecture,
            editing_prefecture: false,
        };
    },

    componentDidMount: function() {
        pagenav.onChange(function(version) {
            this.setState({version: version});
        }.bind(this));
    },

    componentDidUpdate: function() {
        if (this.focus_element && this.focus_element != this.already_focused) {
            this.focus_element.focus();
            this.already_focused = this.focus_element;
        }
    },

    setQproChanged: function(val) {
        this.state.qpro_changed[this.state.version] = val;
        return this.state.qpro_changed
    },

    setQproSaving: function(val) {
        this.state.qpro_saving[this.state.version] = val;
        return this.state.qpro_saving;
    },

    setQproSaved: function(val) {
        this.state.qpro_saved[this.state.version] = val;
        return this.state.qpro_saved;
    },

    setMenuChanged: function(val) {
        this.state.menu_changed[this.state.version] = val;
        return this.state.menu_changed;
    },

    setMenuSaving: function(val) {
        this.state.menu_saving[this.state.version] = val;
        return this.state.menu_saving;
    },

    setMenuSaved: function(val) {
        this.state.menu_saved[this.state.version] = val;
        return this.state.menu_saved;
    },

    setThemeChanged: function(val) {
        this.state.theme_changed[this.state.version] = val;
        return this.state.theme_changed;
    },

    setThemeSaving: function(val) {
        this.state.theme_saving[this.state.version] = val;
        return this.state.theme_saving;
    },

    setThemeSaved: function(val) {
        this.state.theme_saved[this.state.version] = val;
        return this.state.theme_saved;
    },

    saveQproOptions: function(event) {
        this.setState({qpro_saving: this.setQproSaving(true), qpro_saved: this.setQproSaved(false)});
        AJAX.post(
            Link.get('updateqpro'),
            {
                version: this.state.version,
                qpro: this.state.player[this.state.version].qpro,
            },
            function(response) {
                var player = this.state.player
                player[response.version].qpro = response.qpro;
                this.setState({
                    player: player,
                    qpro_saving: this.setQproSaving(false),
                    qpro_saved: this.setQproSaved(true),
                    qpro_changed: this.setQproChanged(false),
                })
            }.bind(this)
        )
    },

    saveMenuOptions: function(event) {
        this.setState({menu_saving: this.setMenuSaving(true), menu_saved: this.setMenuSaved(false)});
        AJAX.post(
            Link.get('updateflags'),
            {
                version: this.state.version,
                flags: this.state.player[this.state.version].flags,
            },
            function(response) {
                var player = this.state.player;
                player[response.version].flags = response.flags;
                this.setState({
                    player: player,
                    menu_saving: this.setMenuSaving(false),
                    menu_saved: this.setMenuSaved(true),
                    menu_changed: this.setMenuChanged(false),
                });
            }.bind(this)
        );
        event.preventDefault();
    },

    saveThemeOptions: function(event) {
        this.setState({theme_saving: this.setThemeSaving(true), theme_saved: this.setThemeSaved(false)});
        AJAX.post(
            Link.get('updatesettings'),
            {
                version: this.state.version,
                settings: this.state.player[this.state.version].settings,
            },
            function(response) {
                var player = this.state.player;
                player[response.version].settings = response.settings;
                this.setState({
                    player: player,
                    theme_saving: this.setThemeSaving(false),
                    theme_saved: this.setThemeSaved(true),
                    theme_changed: this.setThemeChanged(false),
                });
            }.bind(this)
        );
        event.preventDefault();
    },

    saveDJName: function(event) {
        AJAX.post(
            Link.get('updatename'),
            {
                version: this.state.version,
                name: this.state.new_name,
            },
            function(response) {
                var player = this.state.player;
                player[response.version].name = response.name;
                this.setState({
                    player: player,
                    new_name: this.state.player[response.version].name,
                    editing_name: false,
                });
            }.bind(this)
        );
        event.preventDefault();
    },

    savePrefecture: function(event) {
        AJAX.post(
            Link.get('updateprefecture'),
            {
                version: this.state.version,
                prefecture: this.state.new_prefecture,
            },
            function(response) {
                var player = this.state.player;
                player[response.version].prefecture = response.prefecture;
                this.setState({
                    player: player,
                    new_prefecture: this.state.player[response.version].prefecture,
                    editing_prefecture: false,
                });
            }.bind(this)
        );
        event.preventDefault();
    },

    leaveArcade: function(event) {
        AJAX.post(
            Link.get('leavearcade'),
            {
                version: this.state.version,
            },
            function(response) {
                var player = this.state.player;
                player[response.version].arcade = "";
                this.setState({
                    player: player,
                });
            }.bind(this)
        );
        event.preventDefault();
    },

    renderDJName: function(player) {
        return (
            <form className="inline" onSubmit={this.saveDJName}>
                {
                    !this.state.editing_name ?
                    <div className="fields">
                        <div className="field">
                            <p>
                                <b>DJ Name</b>
                                <br/>
                                {player.name}
                                <br />
                                <Edit onClick={function(event) {
                                this.setState({editing_name: true});
                            }.bind(this)} />
                            </p>
                        </div>
                    </div>
                    :
                    <div className="fields">
                        <div className="field">
                            <b>Change DJ Name</b>
                        </div>
                        <div className="field">
                            <label for="name">New DJ Name</label>
                            <input
                                type="text"
                                className="inline"
                                maxlength="6"
                                size="6"
                                autofocus="true"
                                placeholder="RYU*"
                                ref={c => (this.focus_element = c)}
                                value={this.state.new_name}
                                onChange={function(event) {
                                    var value = event.target.value.toUpperCase();
                                    var intRegex = /^[-&$#\\.\\?\\*!A-Z0-9]*$/;
                                    if (value.length <= 6 && intRegex.test(value)) {
                                        this.setState({new_name: value});
                                    }
                                }.bind(this)}
                                name="name"
                            />
                        </div>
                        <div className="field">
                            <input
                                type="submit"
                                value="save"
                            />
                            <input
                                type="button"
                                value="cancel"
                                onClick={function(event) {
                                    this.setState({
                                        new_name: this.state.player[this.state.version].name,
                                        editing_name: false,
                                    });
                                }.bind(this)}
                            />
                        </div>
                    </div>
                }
            </form>
        );
    },

    renderPrefecture: function(player) {
        return (
            <form className="inline" onSubmit={this.savePrefecture}>
                {
                    !this.state.editing_prefecture ?
                    <div className="fields">
                        <div className="field">
                            <p>
                                <b>Prefecture</b>
                                <br/>
                                {Regions[player.prefecture]}
                                <br />
                                <Edit onClick={function(event) {
                                this.setState({editing_prefecture: true});
                            }.bind(this)} />
                            </p>
                        </div>
                    </div>
                    :
                    <div className="fields">
                        <div className="field">
                            <b>Change Prefecture</b>
                        </div>
                        <div className="field">
                            <label for="prefecture">Select New Prefecture</label>
                            <SelectInt
                                name="prefecture"
                                value={this.state.new_prefecture}
                                choices={Regions}
                                onChange={function(choice) {
                                    this.setState({new_prefecture: choice});
                                }.bind(this)}
                            />
                        </div>
                        <div className="field">
                            <input
                                type="submit"
                                value="save"
                            />
                            <input
                                type="button"
                                value="cancel"
                                onClick={function(event) {
                                    this.setState({
                                        new_prefecture: this.state.player[this.state.version].prefecture,
                                        editing_prefecture: false,
                                    });
                                }.bind(this)}
                            />
                        </div>
                    </div>
                }
            </form>
        );
    },

    renderHomeArcade: function(player) {
        if (!player.arcade || player.arcade == "") {
            return (
                <p>
                    <b>Home Arcade</b>
                    <br/>
                    Arcade isn't registred.
                    <br />
                </p>
            );
        }

        return (
            <p>
                <b>Home Arcade</b>
                <br/>
                {player.arcade}
                <br />
                <br />
                <Delete
                    title='leave arcade'
                    onClick={function(event) {
                        this.leaveArcade(event);
                    }.bind(this)}
                />
            </p>
        );
    },

    renderQpro: function(player) {
        return (
            <section>
                <h3>QPro</h3>
                {
                    valid_qpro_options.map(function(qpro_option) {
                        var player = this.state.player[this.state.version]
                        return (
                            <div>
                                <b>{qpro_option}</b>
                                <br/>
                                <input
                                    type="text"
                                    className="inline"
                                    maxlength="3"
                                    size="3"
                                    value={player.qpro[qpro_option]}
                                    onChange={function(event) {
                                        var player = this.state.player;
                                        var value = event.target.value
                                        var numberRegex = /^[0-9]*$/;
                                        if (value.length <= 3 && numberRegex.test(value)) {
                                            player[this.state.version].qpro[qpro_option] = Number(value)
                                            this.setState({
                                                player: player,
                                                qpro_changed: this.setQproChanged(true),
                                            })
                                        }
                                    }.bind(this)}
                                    name={qpro_option}
                                />
                                <br/>
                            </div>
                        )
                    }.bind(this))
                }
                <br/>
                <div>
                    <input
                        type="submit"
                        value="save"
                        disabled={!this.state.qpro_changed[this.state.version]}
                        onClick={function(event) {
                            this.saveQproOptions(event);
                        }.bind(this)}
                    />
                    { this.state.qpro_saving[this.state.version] ?
                        <img className="loading" src={Link.get('static', 'loading-16.gif')} /> :
                        null
                    }
                    { this.state.qpro_saved[this.state.version] ?
                        <span>&#x2713;</span> :
                        null
                    }
                </div>
            </section>
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
                    <div class="inner">
                    <h2>User Profile - {window.versions[this.state.version]}</h2>
                    <p>
                        <h4>Select Version</h4>
                        <SelectVersion
                            name="version"
                            value={ filteredVersion.indexOf(item[this.state.version - 1]) }
                            versions={ filteredVersion }
                            onChange={function(event) {
                                var version = item.indexOf(filteredVersion[event]) + 1
                                if (this.state.editing_name || this.state.editing_prefecture) { return; }
                                if (this.state.version == version) { return; }
                                this.setState({
                                    version: version,
                                    new_name: this.state.player[version].name,
                                    new_prefecture: this.state.player[version].prefecture,
                                });
                                pagenav.navigate(version);
                            }.bind(this)}
                        />
                    </p>
                    </div>
                    <section>
                        <div>
                            {this.renderDJName(player)}
                            {this.renderPrefecture(player)}
                            {this.renderHomeArcade(player)}
                        </div>
                    </section>
                    <hr/>
                    <section>
                        <div className="inner">
                            <h3>QPro</h3>
                            <form className="inline">
                                <div className="fields">
                                    {
                                        valid_qpro_options.map(function(qpro_option) {
                                            var player = this.state.player[this.state.version]
                                            return (
                                                <div className="field">
                                                    <b>{qpro_option}</b>
                                                    <br/>
                                                    <input
                                                        type="text"
                                                        className="inline"
                                                        maxlength="3"
                                                        size="3"
                                                        value={player.qpro[qpro_option]}
                                                        onChange={function(event) {
                                                            var player = this.state.player;
                                                            var value = event.target.value
                                                            var numberRegex = /^[0-9]*$/;
                                                            if (value.length <= 3 && numberRegex.test(value)) {
                                                                player[this.state.version].qpro[qpro_option] = Number(value)
                                                                this.setState({
                                                                    player: player,
                                                                    qpro_changed: this.setQproChanged(true),
                                                                })
                                                            }
                                                        }.bind(this)}
                                                        name={qpro_option}
                                                    />
                                                    {/* <SelectInt
                                                        name={qpro_option}
                                                        value={_choices[qpro_option]}
                                                        choices={_choices}
                                                        onChange={function(choice) {
                                                            var player = this.state.player;
                                                            player[this.state.version].qpro[qpro_option] = _choices[choice];
                                                            this.setState({
                                                                player: player,
                                                                qpro_changed: this.setQproChanged(true),
                                                            })
                                                        }.bind(this)}
                                                    /> */}
                                                </div>
                                            )
                                        }.bind(this))
                                    }
                                    <div className="field">
                                        <input
                                            type="submit"
                                            value="save"
                                            disabled={!this.state.qpro_changed[this.state.version]}
                                            onClick={function(event) {
                                                this.saveQproOptions(event);
                                            }.bind(this)}
                                        />
                                        { this.state.qpro_saving[this.state.version] ?
                                            <img className="loading" src={Link.get('static', 'loading-16.gif')} /> :
                                            null
                                        }
                                        { this.state.qpro_saved[this.state.version] ?
                                            <span>&#x2713;</span> :
                                            null
                                        }
                                    </div>
                                </div>
                            </form>
                        </div>
                    </section>
                    <section>
                        <div>
                            <h3>Theme</h3>
                            <form className="inline">
                                <div className="fields">
                                    {
                                        Object.keys(IIDXOptions[this.state.version]).map(function(theme_option) {
                                            return (
                                                <div className="field">
                                                    <b>{theme_option_names[theme_option]}</b>
                                                    <br/>
                                                    <SelectInt
                                                        name={theme_option}
                                                        value={player.settings[theme_option]}
                                                        choices={IIDXOptions[this.state.version][theme_option]}
                                                        onChange={function(choice) {
                                                            var player = this.state.player;
                                                            player[this.state.version].settings[theme_option] = choice;
                                                            this.setState({
                                                                player: player,
                                                                theme_changed: this.setThemeChanged(true),
                                                            });
                                                        }.bind(this)}
                                                    />
                                                </div>
                                            );
                                        }.bind(this))
                                    }
                                    <div className="field">
                                        <input
                                            type="submit"
                                            value="save"
                                            disabled={!this.state.theme_changed[this.state.version]}
                                            onClick={function(event) {
                                                this.saveThemeOptions(event);
                                            }.bind(this)}
                                        />
                                        { this.state.theme_saving[this.state.version] ?
                                            <img className="loading" src={Link.get('static', 'loading-16.gif')} /> :
                                            null
                                        }
                                        { this.state.theme_saved[this.state.version] ?
                                            <span>&#x2713;</span> :
                                            null
                                        }
                                    </div>
                                </div>
                            </form>
                        </div>
                    </section>
                    <section>
                        <div>
                            <h3>Menu Options</h3>
                        </div>
                    </section>
                    <section>
                        {valid_menu_options.map(function(menu_option) {
                            return (
                                <div className="iidx menuoption">
                                    <input
                                        name={menu_option}
                                        id={menu_option}
                                        type="checkbox"
                                        checked={player.flags[menu_option]}
                                        onChange={function(event) {
                                            var player = this.state.player;
                                            player[this.state.version].flags[menu_option] = event.target.checked;
                                            this.setState({
                                                player: player,
                                                menu_changed: this.setMenuChanged(true),
                                            });
                                        }.bind(this)}
                                    />
                                    <label htmlFor={menu_option}>{menu_option_names[menu_option]}</label>
                                </div>
                            );
                        }.bind(this))}
                        <input
                            type="submit"
                            disabled={!this.state.menu_changed[this.state.version]}
                            value="save"
                            onClick={function(event) {
                                this.saveMenuOptions(event);
                            }.bind(this)}
                        />
                        { this.state.menu_saving[this.state.version] ?
                            <img className="loading" src={Link.get('static', 'loading-16.gif')} /> :
                            null
                        }
                        { this.state.menu_saved[this.state.version] ?
                            <span>{ "\u2713" }</span> :
                            null
                        }
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
    React.createElement(settings_view, null),
    document.getElementById('content')
);
