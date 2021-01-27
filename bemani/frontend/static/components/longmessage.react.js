/** @jsx React.DOM */

var LongMessage = React.createClass({
    getInitialState: function(props) {
        return {
            expanded: false,
        };
    },

    render: function() {
        var length = this.props.length ? this.props.length : 50;
        var text = this.props.children;
        if (text.length > length) {
            if (this.state.expanded) {
                return (
                    <div className="longmessage">
                        <pre>{text}</pre>
                        <button className="viewmore" onClick={function(event) { this.setState({expanded: false}); }.bind(this)}>
                            View Less
                        </button>
                    </div>
                );
            } else {
                return (
                    <div className="longmessage">
                        <pre>{text.substring(0, length)}...</pre>
                        <a className="viewmore"
                            onClick={function(event) {
                                this.setState({expanded: true});
                            }.bind(this)}>
                            View More
                        </a>
                    </div>
                );
            }
        } else {
            return <div className="longmessage"><pre>{text}</pre></div>;
        }
    },
});
