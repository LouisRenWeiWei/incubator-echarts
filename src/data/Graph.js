/**
 * Graph data structure
 *
 * @module echarts/data/Graph
 * @author Yi Shen(https://www.github.com/pissang)
 */
define(function(require) {

    'use strict';

    var zrUtil = require('zrender/core/util');
    var Model = require('../model/Model');

    /**
     * @alias module:echarts/data/Graph
     * @constructor
     * @param {boolean} directed
     */
    var Graph = function(directed) {
        /**
         * 是否是有向图
         * @type {boolean}
         * @private
         */
        this._directed = directed || false;

        /**
         * @type {Array.<module:echarts/data/Graph.Node>}
         * @readOnly
         */
        this.nodes = [];

        /**
         * @type {Array.<module:echarts/data/Graph.Edge>}
         * @readOnly
         */
        this.edges = [];

        /**
         * @type {Object.<string, module:echarts/data/Graph.Node>}
         * @private
         */
        this._nodesMap = {};
        /**
         * @type {Object.<string, module:echarts/data/Graph.Edge>}
         * @private
         */
        this._edgesMap = {};
    };

    var graphProto = Graph.prototype;
    /**
     * @type {string}
     */
    graphProto.type = 'graph';

    /**
     * If is directed graph
     * @return {boolean}
     */
    graphProto.isDirected = function () {
        return this._directed;
    };

    /**
     * Add a new node
     * @param {string} name
     * @param {number} [dataIndex]
     */
    graphProto.addNode = function (name, dataIndex) {
        var nodesMap = this._nodesMap;

        if (nodesMap[name]) {
            return nodesMap[name];
        }

        var node = new Node(name, dataIndex);
        node.hostGraph = this;

        this.nodes.push(node);

        nodesMap[name] = node;
        return node;
    };

    /**
     * Get node by name
     * @param  {string} name
     * @return {module:echarts/data/Graph.Node}
     */
    graphProto.getNodeByName = function (name) {
        return this._nodesMap[name];
    };

    /**
     * Add a new edge
     * @param {string|module:echarts/data/Graph.Node} n1
     * @param {string|module:echarts/data/Graph.Node} n2
     * @param {number} [dataIndex=-1]
     * @return {module:echarts/data/Graph.Edge}
     */
    graphProto.addEdge = function (n1, n2, dataIndex) {
        var nodesMap = this._nodesMap;
        var edgesMap = this._edgesMap;

        if (typeof n1 == 'string') {
            n1 = nodesMap[n1];
        }
        if (typeof n2 == 'string') {
            n2 = nodesMap[n2];
        }
        if (!n1 || !n2) {
            return;
        }

        var key = n1.name + '-' + n2.name;
        if (edgesMap[key]) {
            return edgesMap[key];
        }

        var edge = new Edge(n1, n2, dataIndex);

        if (this._directed) {
            n1.outEdges.push(edge);
            n2.inEdges.push(edge);
        }
        n1.edges.push(edge);
        if (n1 !== n2) {
            n2.edges.push(edge);
        }

        this.edges.push(edge);
        edgesMap[key] = edge;

        return edge;
    };

    /**
     * Get edge by two nodes
     * @param  {module:echarts/data/Graph.Node|string} n1
     * @param  {module:echarts/data/Graph.Node|string} n2
     * @return {module:echarts/data/Graph.Edge}
     */
    graphProto.getEdge = function (n1, n2) {
        if (typeof(n1) !== 'string') {
            n1 = n1.name;
        }
        if (typeof(n2) !== 'string') {
            n2 = n2.name;
        }

        var edgesMap = this._edgesMap;

        if (this._directed) {
            return edgesMap[n1 + '-' + n2];
        } else {
            return edgesMap[n1 + '-' + n2]
                || edgesMap[n2 + '-' + n1];
        }
    };

    /**
     * Iterate all nodes
     * @param  {Function} cb
     * @param  {*} [context]
     */
    graphProto.eachNode = function (cb, context) {
        var nodes = this.nodes;
        var len = nodes.length;
        for (var i = 0; i < len; i++) {
            if (nodes[i].dataIndex >= 0) {
                cb.call(context, nodes[i], i);
            }
        }
    };

    /**
     * Iterate all edges
     * @param  {Function} cb
     * @param  {*} [context]
     */
    graphProto.eachEdge = function (cb, context) {
        var edges = this.edges;
        var len = edges.length;
        for (var i = 0; i < len; i++) {
            if (edges[i].dataIndex >= 0
                && edges[i].node1.dataIndex >= 0
                && edges[i].node2.dataIndex >= 0
            ) {
                cb.call(context, edges[i], i);
            }
        }
    };

    /**
     * Breadth first traverse
     * @param {Function} cb
     * @param {module:echarts/data/Graph.Node} startNode
     * @param {string} [direction='none'] 'none'|'in'|'out'
     * @param {*} [context]
     */
    graphProto.breadthFirstTraverse = function (
        cb, startNode, direction, context
    ) {
        if (typeof(startNode) === 'string') {
            startNode = this._nodesMap[startNode];
        }
        if (!startNode) {
            return;
        }

        var edgeType = direction === 'out'
            ? 'outEdges' : (direction === 'in' ? 'inEdges' : 'edges');

        for (var i = 0; i < this.nodes.length; i++) {
            this.nodes[i].__visited = false;
        }

        if (cb.call(context, startNode, null)) {
            return;
        }

        var queue = [startNode];
        while (queue.length) {
            var currentNode = queue.shift();
            var edges = currentNode[edgeType];

            for (var i = 0; i < edges.length; i++) {
                var e = edges[i];
                var otherNode = e.node1 === currentNode
                    ? e.node2 : e.node1;
                if (!otherNode.__visited) {
                    if (cb.call(otherNode, otherNode, currentNode)) {
                        // Stop traversing
                        return;
                    }
                    queue.push(otherNode);
                    otherNode.__visited = true;
                }
            }
        }
    };

    // TODO
    graphProto.depthFirstTraverse = function (
        cb, startNode, direction, context
    ) {

    };

    graphProto.update = function () {
        var data = this.data;
        var nodes = this.nodes;

        for (var i = 0, len = nodes.length; i < len; i++) {
            nodes[i].dataIndex = -1;
        }

        for (var i = 0, len = data.count(); i < len; i++) {
            nodes[data.getRawIndex(i)].dataIndex = i;
        }
    };

    /**
     * @return {module:echarts/data/Graph}
     */
    graphProto.clone = function () {
        var graph = new Graph(this._directed);
        var nodes = this.nodes;
        var edges = this.edges;
        for (var i = 0; i < nodes.length; i++) {
            graph.addNode(nodes[i].name, nodes[i].dataIndex);
        }
        for (var i = 0; i < edges.length; i++) {
            var e = edges[i];
            graph.addEdge(e.node1.name, e.node2.name, e.dataIndex);
        }
        return graph;
    };


    /**
     * @alias module:echarts/data/Graph.Node
     */
    function Node(name, dataIndex) {
        /**
        * @type {string}
        */
        this.name = name || '';

        /**
        * @type {Array.<module:echarts/data/Graph.Edge>}
        */
        this.inEdges = [];
        /**
        * @type {Array.<module:echarts/data/Graph.Edge>}
        */
        this.outEdges = [];
        /**
        * @type {Array.<module:echarts/data/Graph.Edge>}
        */
        this.edges = [];
        /**
         * @type {module:echarts/data/Graph}
         */
        this.hostGraph;

        /**
         * @type {number}
         */
        this.dataIndex = dataIndex == null ? -1 : dataIndex;
    };

    Node.prototype = {

        constructor: Node,

        /**
         * @return {number}
         */
        degree: function () {
            return this.edges.length;
        },

        /**
         * @return {number}
         */
        inDegree: function () {
            return this.inEdges.length;
        },

        /**
        * @return {number}
        */
        outDegree: function () {
            return this.outEdges.length;
        },

        /**
         * @param {string} [path]
         * @return {module:echarts/model/Model}
         */
        getModel: function (path) {
            if (this.dataIndex < 0) {
                return;
            }
            var graph = this.hostGraph;
            var itemModel = graph.data.getItemModel(this.dataIndex);

            return itemModel.getModel(path);
        },


        // Proxy methods

        /**
         * @param {string=} [dimension='value'] Default 'value'. can be 'a', 'b', 'c', 'd', 'e'.
         * @return {number}
         */
        getValue: function (dimension) {
            return this.hostTree.data.get(dimension || 'value', this.dataIndex);
        },

        /**
         * @param {Object|string} key
         * @param {*} [value]
         */
        setVisual: function (key, value) {
            this.dataIndex >= 0
                && this.hostGraph.data.setItemVisual(this.dataIndex, key, value);
        },

        /**
         * @param {string} key
         * @return {boolean}
         */
        getVisual: function (key, ignoreParent) {
            return this.hostGraph.data.getItemVisual(this.dataIndex, key, ignoreParent)
        },

        /**
         * @param {Object} layout
         * @return {boolean} [merge=false]
         */
        setLayout: function (layout, merge) {
            this.dataIndex >= 0
                && this.hostGraph.data.setItemLayout(this.dataIndex, layout, merge);
        },

        /**
         * @return {Object}
         */
        getLayout: function () {
            return this.hostGraph.data.getItemLayout(this.dataIndex);
        },

        /**
         * @return {number}
         */
        getRawIndex: function () {
            return this.hostGraph.data.getRawIndex(this.dataIndex);
        }
    };

    /**
     * 图边
     * @alias module:echarts/data/Graph.Edge
     * @param {module:echarts/data/Graph.Node} n1
     * @param {module:echarts/data/Graph.Node} n2
     * @param {number} [dataIndex=-1]
     */
    function Edge(n1, n2, dataIndex) {

        /**
         * 节点1，如果是有向图则为源节点
         * @type {module:echarts/data/Graph.Node}
         */
        this.node1 = n1;

        /**
         * 节点2，如果是有向图则为目标节点
         * @type {module:echarts/data/Graph.Node}
         */
        this.node2 = n2;

        this.dataIndex = dataIndex == null ? -1 : dataIndex;
    };

    Graph.Node = Node;
    Graph.Edge = Edge;

    return Graph;
});