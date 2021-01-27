/*** @jsx React.DOM */

var home = React.createClass({
    getInitialState: function(props) {
        return {
            news: window.news,
        };
    },

    render: function() {
        return (
            <div>
                <h1>News</h1>
                {
                this.state.news.map(function(entry) {
                    return (
                        <section>
                            <Timestamp timestamp={entry.timestamp} />
                            <h2>{ entry.title }</h2>
                            <p dangerouslySetInnerHTML={ {__html: entry.body} }></p>
                            <hr/>
                        </section>
                    );
                }.bind(this))
            }</div>
        );
    },
});

ReactDOM.render(
    React.createElement(home, null),
    document.getElementById('content')
);
