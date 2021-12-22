import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../../store';
import { processDot, piNodeChildren, piNodeParents, descendants, findNodesClusters } from './auxi';
import { NodeInterface, ProofState } from '../../../interfaces/interfaces';

const initialState: ProofState = {
    proof: [],
    view: 'full',
    style: 'graph',
    hiddenNodes: [],
    letMap: {},
    visualInfo: [],
};

export const proofSlice = createSlice({
    name: 'proof',
    initialState,

    reducers: {
        process: (state, action: PayloadAction<string>) => {
            let proofJSON;
            let dot = action.payload;
            let isJSON = false;

            // If the payload is a .json file
            if (dot.indexOf('{"dot":"') !== -1) {
                proofJSON = JSON.parse(dot);
                dot = proofJSON.dot;
                isJSON = true;
            }

            const [proof, letMap] = processDot(dot);
            state.proof = proof;
            state.view = isJSON ? proofJSON.view : 'full';
            state.hiddenNodes = isJSON ? proofJSON.hiddenNodes : [];
            state.letMap = letMap;
            if (isJSON) state.visualInfo = proofJSON.visualInfo;
            else {
                const visualInfo: ProofState['visualInfo'] = {};
                state.proof.forEach((node) => {
                    visualInfo[node.id] = {
                        color: '#fff',
                        x: 0,
                        y: 0,
                        selected: false,
                    };
                });
                state.visualInfo = visualInfo;
            }
        },
        hideNodes: (state, action: PayloadAction<number[]>) => {
            const toHideNodes = action.payload.filter(
                (id) =>
                    id > 0 &&
                    id < state.proof.length &&
                    state.hiddenNodes.every((hiddenNodesArray) => hiddenNodesArray.indexOf(id) === -1),
            );

            const clusters = findNodesClusters(state.proof, toHideNodes);
            state.hiddenNodes = state.hiddenNodes
                .concat(clusters)
                .filter((hiddenNodesArray) => hiddenNodesArray.length > 0);

            // Set the visual info for the new pi nodes
            const piNodeId = Object.keys(state.visualInfo).length;
            for (let i = 0; i < clusters.length; i++) {
                state.visualInfo = {
                    ...state.visualInfo,
                    [piNodeId + i]: {
                        color: '#555',
                        x: 0,
                        y: 0,
                        selected: false,
                    },
                };
            }

            // Unselect the selected nodes
            toHideNodes.forEach(
                (id) =>
                    (state.visualInfo[id] = {
                        ...state.visualInfo[id],
                        selected: false,
                    }),
            );
        },
        foldAllDescendants: (state, action: PayloadAction<number>) => {
            state.hiddenNodes = state.hiddenNodes
                .concat([
                    [action.payload, ...descendants(state.proof, action.payload)].filter(
                        (id) =>
                            id > 0 &&
                            id < state.proof.length &&
                            state.hiddenNodes.every((hiddenNodesArray) => hiddenNodesArray.indexOf(id) === -1),
                    ),
                ])
                .filter((hiddenNodesArray) => hiddenNodesArray.length > 0);

            // Set the visual info for the new pi node and the root node
            const piNodeId = Object.keys(state.visualInfo).length;
            state.visualInfo = {
                ...state.visualInfo,
                [action.payload]: {
                    ...state.visualInfo[action.payload],
                    selected: false,
                },
                [piNodeId]: {
                    color: '#555',
                    x: 0,
                    y: 0,
                    selected: false,
                },
            };
        },
        unhideNodes: (state, action: PayloadAction<{ pi: number; hiddens: number[] }>) => {
            const { pi, hiddens } = action.payload;
            state.hiddenNodes = state.hiddenNodes
                .map((hiddenNodesArray) => hiddenNodesArray.filter((id) => hiddens.indexOf(id) === -1))
                .filter((hiddenNodesArray) => hiddenNodesArray.length > 0);

            // Make sure the ids are realocated
            const size = Object.keys(state.visualInfo).length;
            for (let i = pi; i < size; i++) {
                state.visualInfo[pi] = state.visualInfo[pi + 1];
            }
            // Delete the last position
            delete state.visualInfo[size - 1];

            // Unselect the hidden nodes
            hiddens.forEach(
                (id) =>
                    (state.visualInfo[id] = {
                        ...state.visualInfo[id],
                        selected: false,
                    }),
            );
        },
        setVisualInfo: (state, action: PayloadAction<ProofState['visualInfo']>) => {
            state.visualInfo = action.payload;
        },
        selectNodes: (state, action: PayloadAction<number[]>) => {
            action.payload.forEach((id) => {
                if (id >= 0 && id < Object.keys(state.visualInfo).length) {
                    state.visualInfo[id].selected = true;
                }
            });
        },
        changeStyle: (state, action: PayloadAction<'graph' | 'directory'>) => {
            switch (action.payload) {
                case 'graph':
                    state.style = 'graph';
                    break;
                case 'directory':
                    state.style = 'directory';
                    break;
            }
        },
        applyView: (state, action: PayloadAction<'basic' | 'propositional' | 'full'>) => {
            const visualInfoSize = Object.keys(state.visualInfo).length;
            const proofSize = state.proof.length;
            // Delete all the pi nodes
            for (let i = 0; i < visualInfoSize - proofSize; i++) {
                delete state.visualInfo[proofSize + i];
            }

            switch (action.payload) {
                //
                case 'basic':
                    state.view = 'basic';
                    state.hiddenNodes = [
                        state.proof
                            .filter((proofNode) => proofNode.views.indexOf('basic') === -1)
                            .map((proofNode) => proofNode.id),
                    ];

                    // Set the visual info for the new pi nodes
                    state.visualInfo = {
                        ...state.visualInfo,
                        [Object.keys(state.visualInfo).length]: {
                            color: '#555',
                            x: 0,
                            y: 0,
                            selected: false,
                        },
                    };

                    break;
                // Hide all nodes that haven't view equal to basic and propositional
                case 'propositional':
                    state.view = 'propositional';
                    state.hiddenNodes = [
                        // Hide nodes that aren't basics a
                        // nos q n são basicos (folhas e o no raiz) e nem proposicionais (outra classe q n tem no .dot1)
                        state.proof
                            .filter(
                                (node) =>
                                    node.views.indexOf('basic') === -1 && node.views.indexOf('propositional') === -1,
                            )
                            .map((node) => node.id),
                    ];

                    // Set the visual info for the new pi nodes
                    state.visualInfo = {
                        ...state.visualInfo,
                        [Object.keys(state.visualInfo).length]: {
                            color: '#555',
                            x: 0,
                            y: 0,
                            selected: false,
                        },
                    };

                    break;
                // View without hidden Nodes
                case 'full':
                    state.view = 'full';
                    state.hiddenNodes = [];
                    break;
            }
        },
        applyColor: (state, action: PayloadAction<string>) => {
            Object.keys(state.visualInfo).forEach((id) => {
                if (state.visualInfo[Number(id)].selected) {
                    state.visualInfo[Number(id)].color = action.payload;
                    state.visualInfo[Number(id)].selected = false;
                }
            });
        },
    },
});

export const {
    process,
    hideNodes,
    foldAllDescendants,
    unhideNodes,
    setVisualInfo,
    selectNodes,
    changeStyle,
    applyView,
    applyColor,
} = proofSlice.actions;

export const selectProof = (state: RootState): NodeInterface[] => {
    let proof = state.proof.proof;
    const hiddenNodes = state.proof.hiddenNodes;

    hiddenNodes.forEach((hiddenNodesArray) => {
        const children = piNodeChildren(proof, hiddenNodesArray);
        const parents = piNodeParents(proof, hiddenNodesArray);
        const piNodeId = proof.length;
        proof = proof.concat({
            id: piNodeId,
            conclusion: '∴',
            rule: 'π',
            args: '',
            views: [],
            children: children,
            parents: parents,
            hiddenNodes: hiddenNodesArray.map((hiddenNode) => proof[hiddenNode]),
            descendants: 1,
        });

        const piNode = proof[piNodeId];

        children.forEach(
            (childId) =>
                (proof[childId] = {
                    ...proof[childId],
                    parents: proof[childId].parents
                        .concat([piNodeId])
                        .filter((proofNode) => hiddenNodesArray.indexOf(proofNode) === -1),
                }),
        );
        parents.forEach(
            (parentId) =>
                (proof[parentId] = {
                    ...proof[parentId],
                    children: proof[parentId].children
                        .concat([piNodeId])
                        .filter((proofNode) => hiddenNodesArray.indexOf(proofNode) === -1),
                }),
        );

        // Get the high hierarchy nodes in this pi node
        const highHierarchyNodes = hiddenNodesArray?.filter((node) =>
            proof[node].parents.every((parentId) => piNode.parents.indexOf(parentId) !== -1),
        );

        // Get the conclusion array
        const conclusion = highHierarchyNodes.map((node) => ' ' + proof[node].conclusion);
        piNode.conclusion = conclusion.length > 1 ? `[${conclusion} ]` : `${conclusion}`;

        // Get the rule array
        const rule = highHierarchyNodes.map((node) => ' ' + proof[node].rule);
        piNode.rule = rule.length > 1 ? `[${rule} ]` : `${rule} `;

        // Set the descendants number
        piNode.descendants = piNode.children.reduce(
            (ac: number, childID) => ((ac += proof[childID].descendants), ac),
            1,
        );
    });

    proof = proof.filter((proofNode) =>
        hiddenNodes.every((hiddenNodesArray) => hiddenNodesArray.indexOf(proofNode.id) === -1),
    );

    return proof;
};

export const selectView = (state: RootState): 'basic' | 'propositional' | 'full' => {
    return state.proof.view;
};

export const selectStyle = (state: RootState): 'graph' | 'directory' => {
    return state.proof.style;
};

export const selectLetMap = (state: RootState): { [Key: string]: string } => {
    return state.proof.letMap;
};

export const selectVisualInfo = (state: RootState): ProofState['visualInfo'] => {
    if (state.proof.proof.length) return state.proof.visualInfo;
    // If there is no proof node
    return { 0: { color: '#555', x: 0, y: 0, selected: false } };
};

export const selectHiddenNodes = (state: RootState): number[][] => {
    return state.proof.hiddenNodes;
};

export default proofSlice.reducer;
