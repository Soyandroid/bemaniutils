/*** @jsx React.DOM */

var UnknownEvent = React.createClass({
    render: function() {
        return (
            <tr key={event.id}>
                <td><Timestamp timestamp={event.timestamp} /></td>
                <td className="unknown">Unknown event {event.type}</td>
                <td className="details">
                    <div>Raw JSON:</div>
                    <LongMessage>{JSON.stringify(event.data, null, 4)}</LongMessage>
                </td>
            </tr>
        );
    },
});

var ExceptionEvent = React.createClass({
    render: function() {
        var event = this.props.event;
        var location = 'Unknown Service';
        var details = 'No details for this type of exception!';
        if (event.data.service == 'frontend') {
            location = 'Web UI';
            details = (
                <span>
                    <div>
                        <div className="inline">URI:</div>
                        <pre className="inline">{event.data.request}</pre>
                    </div>
                    <div>Exception:</div>
                    <LongMessage>{event.data.traceback}</LongMessage>
                </span>
            );
        } else if(event.data.service == 'xrpc') {
            location = 'Game Services';
            details = (
                <span>
                    <div>Request:</div>
                    <LongMessage>{event.data.request}</LongMessage>
                    <div>Exception:</div>
                    <LongMessage>{event.data.traceback}</LongMessage>
                </span>
            );
        } else if(event.data.service == 'scheduler') {
            location = 'Work Scheduler';
            details = (
                <span>
                    <div>Exception:</div>
                    <LongMessage>{event.data.traceback}</LongMessage>
                </span>
            );
        } else if (event.data.service == 'api') {
            location = 'Data Exchange API';
            details = (
                <span>
                    <div>
                        <div className="inline">URI:</div>
                        <pre className="inline">{event.data.request}</pre>
                    </div>
                    <div>Exception:</div>
                    <LongMessage>{event.data.traceback}</LongMessage>
                </span>
            );
        }

        return (
            <tr key={event.id}>
                <td><Timestamp timestamp={event.timestamp} /></td>
                <td className="exception">
                    <div className="circle" />
                    Exception Occurred In {location}
                </td>
                <td className="details">{details}</td>
            </tr>
        );
    },
});

var UnhandledPacketEvent = React.createClass({
    render: function() {
        var event = this.props.event;
        return (
            <tr key={event.id}>
                <td><Timestamp timestamp={event.timestamp} /></td>
                <td className="unhandled">
                    <div className="circle" />
                    Unhandled Packet Received In Game Services
                </td>
                <td className="details">
                    <div>Request:</div>
                    <LongMessage>{event.data.request}</LongMessage>
                </td>
            </tr>
        );
    },
});

var UnauthorizedClientEvent = React.createClass({
    render: function() {
        var event = this.props.event;
        return (
            <tr key={event.id}>
                <td><Timestamp timestamp={event.timestamp} /></td>
                <td className="unauthorized">
                    <div className="circle" />
                    Unauthorized Client Connected To Game Services
                </td>
                <td className="details">
                    <div>
                        <div className="inline">Model:</div>
                        <pre className="inline">{event.data.model}</pre>
                    </div>
                    <div>
                        <div className="inline">PCBID:</div>
                        <pre className="inline">{event.data.pcbid}</pre>
                    </div>
                    <div>
                        <div className="inline">IP Addres:</div>
                        <pre className="inline">{event.data.ip}</pre>
                    </div>
                </td>
            </tr>
        );
    },
});

var PCBEvent = React.createClass({
    render: function() {
        var event = this.props.event;
        return (
            <tr key={event.id}>
                <td><Timestamp timestamp={event.timestamp} /></td>
                <td className="pcbevent">
                    <div className="circle" />
                    PCB Event
                </td>
                <td className="details">
                    <div>
                        <div className="inline">Model:</div>
                        <pre className="inline">{event.data.model}</pre>
                    </div>
                    <div>
                        <div className="inline">PCBID:</div>
                        <pre className="inline">{event.data.pcbid}</pre>
                    </div>
                    <div>
                        <div className="inline">IP Addres:</div>
                        <pre className="inline">{event.data.ip}</pre>
                    </div>
                    <div>
                        <div className="inline">Name:</div>
                        <pre className="inline">{event.data.name}</pre>
                    </div>
                    <div>
                        <div className="inline">Value:</div>
                        <pre className="inline">{event.data.value}</pre>
                    </div>
                </td>
            </tr>
        );
    },
});

var PASELITransactionEvent = React.createClass({
    render: function() {
        var event = this.props.event;
        var username = null;
        var user = null;
        if (this.props.users) {
            if (this.props.users[event.userid]) {
                username = this.props.users[event.userid];
            }
            if (username == null) {
                user = <span className="placeholder">anonymous account</span>;
            } else {
                user = <span>{username}</span>;
            }
        }

        return (
            <tr key={event.id}>
                <td><Timestamp timestamp={event.timestamp} /></td>
                <td className="transaction">
                    <div className="circle" />
                    PASELI Transaction
                </td>
                <td className="details">
                    { user ?
                        <div>
                            <div className="inline"><span className="bolder">User</span></div>
                            <pre className="inline"><a href={Link.get('viewuser', event.userid)}>{user}</a></pre>
                        </div> : null
                    }
                    { this.props.arcades ?
                        <div>
                            <div className="inline"><span className="bolder">Arcade</span></div>
                            <div className="inline">{this.props.arcades[event.arcadeid]}</div>
                        </div> : null
                    }
                    { event.data['pcbid'] ?
                        <div>
                            <div className="inline"><span className="bolder">PCBID</span></div>
                            <pre className="inline">{event.data.pcbid}</pre>
                        </div> : null
                    }
                    <div>
                        <div className="inline"><span className="bolder">Reason</span></div>
                        <pre className="inline">{event.data.reason}</pre>
                    </div>
                    <div>
                        <div className="inline"><span className="bolder">Transaction Amount</span></div>
                        <pre className="inline">{event.data.delta}</pre>
                    </div>
                    { event.data['service'] && event.data['service'] != 0 ?
                        <div>
                            <div className="inline"><span className="bolder">Service PASELI Amount</span></div>
                            <pre className="inline">{event.data.service}</pre>
                        </div> : null
                    }
                    <div>
                        <div className="inline"><span className="bolder">New Balance</span></div>
                        <pre className="inline">{event.data.balance}</pre>
                    </div>
                </td>
            </tr>
        );
    },
});

var JubeatLeagueCourseEvent = React.createClass({
    render: function() {
        var event = this.props.event;
        var game = this.props.versions[event.data.version];
        return (
            <tr key={event.id}>
                <td><Timestamp timestamp={event.timestamp} /></td>
                <td className="scheduled">
                    <div className="circle" />
                    Generated New {game} League Course
                </td>
                <td className="details">
                    <div>Songs:</div>
                    {event.data.songs.map(function(songid) {
                        return (
                            <div>
                                <a href={Link.get('jubeatsong', songid)}>
                                    {this.props.songs[songid].artist}{this.props.songs[songid].artist ? " - " : ""}{this.props.songs[songid].name}
                                </a>
                            </div>
                        );
                    }.bind(this))}
                </td>
            </tr>
        );
    },
});

var JubeatFCChallengeEvent = React.createClass({
    render: function() {
        var event = this.props.event;
        var game = this.props.versions[event.data.version];
        return (
            <tr key={event.id}>
                <td><Timestamp timestamp={event.timestamp} /></td>
                <td className="scheduled">
                    <div className="circle" />
                    Generated New {game} Full Combo Challenge Songs
                </td>
                <td className="details">
                    <div>Challenge:</div>
                    <div>
                        <a href={Link.get('jubeatsong', event.data.today)}>
                            {this.props.songs[event.data.today].artist}{this.props.songs[event.data.today].artist ? " - " : ""}{this.props.songs[event.data.today].name}
                        </a>
                    </div>
                    {event.data.whim ?
                        <div>
                            <div>Whim:</div>
                            <div>
                                <a href={Link.get('jubeatsong', event.data.whim)}>
                                    {this.props.songs[event.data.whim].artist}{this.props.songs[event.data.whim].artist ? " - " : ""}{this.props.songs[event.data.whim].name}
                                </a>
                            </div>
                        </div> : null
                    }
                </td>
            </tr>
        );
    },
});

var IIDXDailyChartsEvent = React.createClass({
    render: function() {
        var event = this.props.event;
        var game = this.props.versions[event.data.version];
        return (
            <tr key={event.id}>
                <td><Timestamp timestamp={event.timestamp} /></td>
                <td className="scheduled">
                    <div className="circle" />
                    Generated New {game} Dailies
                </td>
                <td className="details">
                    <div>Songs:</div>
                    {event.data.music.map(function(songid) {
                        return (
                            <div>
                                <a href={Link.get('iidxsong', songid)}>
                                    {this.props.songs[songid].artist} - {this.props.songs[songid].name}
                                </a>
                            </div>
                        );
                    }.bind(this))}
                </td>
            </tr>
        );
    },
});

var PopnMusicCourseEvent = React.createClass({
    render: function() {
        var event = this.props.event;
        var game = this.props.versions[event.data.version];
        return (
            <tr key={event.id}>
                <td><Timestamp timestamp={event.timestamp} /></td>
                <td className="scheduled">
                    <div className="circle" />
                    Generated New {game} Weekly Course Song
                </td>
                <td className="details">
                    <div>Song:</div>
                    <div>
                        <a href={Link.get('pnmsong', event.data.song)}>
                            {this.props.songs[event.data.song].artist}{this.props.songs[event.data.song].artist ? " - " : ""}{this.props.songs[event.data.song].name}
                        </a>
                    </div>
                </td>
            </tr>
        );
    },
});
