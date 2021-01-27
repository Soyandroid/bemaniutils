/** @jsx React.DOM */

var SelectGame = React.createClass({
    render: function() {
        return (
            <select
                name={this.props.name}
                disabled={this.props.disabled}
                value={this.props.value ? this.props.value : "__NOTHING_VALUE__"}
                onChange={function(event) {
                    var game = event.target.value;
                    if (game == "__NOTHING_VALUE__") {
                        game = null;
                    }
                    if (this.props.onChange) {
                        this.props.onChange(game);
                    }
                }.bind(this)}
            >
                {Object.keys(this.props.games).map(function(index) {
                    return <option value={index}>{ this.props.games[index].name }</option>;
                }.bind(this))}
            </select>
        );
    },
});
