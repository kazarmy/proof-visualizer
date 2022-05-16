import React, { useState, useReducer, useEffect } from 'react';

import { Icon, Collapse, Pre } from '@blueprintjs/core';

import '../../../scss/VisualizerDirectoryStyle.scss';
import { useAppSelector } from '../../../store/hooks';
import { selectTheme } from '../../../store/features/theme/themeSlice';
import { NodeInfo, DirectoryStyleProps } from '../../../interfaces/interfaces';
import { drawerHelpersKind } from '../../../interfaces/enum';
import VisualizerTree from '../../VisualizerTree/VisualizerTree';
import { selectOriginalProof } from '../../../store/features/proof/proofSlice';

const VisualizerDirectoryStyle: React.FC<DirectoryStyleProps> = ({
    proofTree,
    ruleHelper,
    indent,
    translate,
}: DirectoryStyleProps) => {
    const proof = useAppSelector(selectOriginalProof);
    const darkTheme = useAppSelector(selectTheme);
    const [nodeInfo, setNodeInfo] = useState<NodeInfo>({
        rule: '',
        args: '',
        conclusion: '',
        nHided: 0,
        nDescendants: 0,
        hiddenNodes: [],
        dependencies: [],
    });
    const [[ruleHelperIsOpen, argsHelperIsOpen, concHelperIsOpen], dispatchHelper] = useReducer(
        (state: boolean[], action: { type: drawerHelpersKind; payload: boolean }): boolean[] => {
            const { type, payload } = action;

            // Act over all the positions
            if (type === drawerHelpersKind.ALL) {
                for (let i = 0; i < state.length; i++) {
                    state[i] = payload;
                }
            }
            // If wanna set a position
            else if (payload) {
                // Reset everything and set the wanted
                for (let i = 0; i < state.length; i++) {
                    state[i] = i === type ? payload : false;
                }
            }
            // If wanna only reset a position
            else state[type] = payload;

            return [...state];
        },
        // Rule, args, conclusion
        [false, false, false],
    );
    const [positionMap, setMap] = useState<any>({});

    useEffect(() => {
        const _map: any = {};
        // Map the { [node id]: list array id }
        proof.forEach((n, id) => (_map[n.id] = id));
        setMap(_map);
    }, [proof]);

    const nodeInfoTable = () => {
        return (
            <table
                id="table-node-info"
                className="bp3-html-table bp3-html-table-bordered bp3-html-table-condensed bp3-html-table-striped"
                style={{ width: '100%' }}
            >
                <thead>
                    <tr>
                        <th>Property</th>
                        <th>Value</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            <strong>RULE </strong>
                            <Icon
                                id="icon"
                                icon="help"
                                onClick={() => {
                                    dispatchHelper({ type: drawerHelpersKind.RULE, payload: !ruleHelperIsOpen });
                                }}
                            ></Icon>
                        </td>
                        <td>
                            {nodeInfo.rule}
                            <Collapse isOpen={ruleHelperIsOpen}>
                                <Pre style={{ maxHeight: '300px', overflow: 'auto' }} id="pre-rule">
                                    {ruleHelper(nodeInfo.rule)}
                                </Pre>
                            </Collapse>
                        </td>
                    </tr>

                    {nodeInfo.args && (
                        <tr>
                            <td>
                                <strong>ARGS</strong>{' '}
                                {nodeInfo.args.indexOf('let') !== -1 ? (
                                    <Icon
                                        id="icon"
                                        icon="translate"
                                        onClick={() => {
                                            dispatchHelper({
                                                type: drawerHelpersKind.ARGS,
                                                payload: !argsHelperIsOpen,
                                            });
                                        }}
                                    ></Icon>
                                ) : null}
                            </td>
                            <td style={{ maxHeight: '300px', overflow: 'auto' }}>
                                {nodeInfo.args}
                                {nodeInfo.args.indexOf('let') !== -1 ? (
                                    <Collapse isOpen={argsHelperIsOpen}>
                                        <Pre style={{ maxHeight: '300px', overflow: 'auto' }} id="pre-rule">
                                            {indent(translate(nodeInfo.args))}
                                        </Pre>
                                    </Collapse>
                                ) : null}
                            </td>
                        </tr>
                    )}

                    <tr>
                        <td style={{ maxHeight: '300px', overflow: 'auto' }}>
                            <strong>CONCLUSION</strong>{' '}
                            {nodeInfo.conclusion.indexOf('let') !== -1 ? (
                                <Icon
                                    id="icon"
                                    icon="translate"
                                    onClick={() => {
                                        dispatchHelper({ type: drawerHelpersKind.CONC, payload: !concHelperIsOpen });
                                    }}
                                ></Icon>
                            ) : null}
                        </td>
                        <td style={{ maxHeight: '300px', overflow: 'auto' }}>
                            {nodeInfo.conclusion}
                            {nodeInfo.conclusion.indexOf('let') !== -1 ? (
                                <Collapse isOpen={concHelperIsOpen}>
                                    <Pre style={{ maxHeight: '300px', overflow: 'auto' }} id="pre-rule">
                                        {indent(translate(nodeInfo.conclusion))}
                                    </Pre>
                                </Collapse>
                            ) : null}
                        </td>
                    </tr>

                    {nodeInfo.nDescendants ? (
                        <tr>
                            <td>
                                <strong>#DESCENDANTS</strong>
                            </td>
                            <td>{nodeInfo.nDescendants}</td>
                        </tr>
                    ) : null}

                    {nodeInfo.nHided ? (
                        <tr>
                            <td>
                                <strong>#HIDDEN</strong>
                            </td>
                            <td>{`[${nodeInfo.hiddenNodes.map((node) => ' ' + node)} ]`}</td>
                        </tr>
                    ) : null}
                    {nodeInfo.dependencies.length ? (
                        <tr>
                            <td>
                                <strong>DEPENDENCIES</strong>
                            </td>
                            <td>{`${nodeInfo.dependencies.map(
                                (dependency) => ` ${dependency.piId}: [${dependency.depsId.map((dep) => ' ' + dep)} ] `,
                            )}`}</td>
                        </tr>
                    ) : null}
                </tbody>
            </table>
        );
    };

    return (
        <div
            className="dir-style"
            style={{
                backgroundColor: darkTheme ? 'rgb(57, 75, 89)' : 'white',
                height:
                    window.innerHeight - (document.getElementsByClassName('bp3-navbar')[0] as HTMLElement).offsetHeight,
            }}
        >
            <div
                style={{
                    width: '50%',
                    height: '100%',
                    float: 'left',
                    clear: 'none',
                    borderRight: '1px solid black',
                    overflow: 'auto',
                }}
            >
                <VisualizerTree
                    darkTheme={darkTheme}
                    proof={proof}
                    positionMap={positionMap}
                    content={proofTree}
                    setNodeInfo={setNodeInfo}
                    originalNodeInfo={{
                        rule: '',
                        args: '',
                        conclusion: '',
                        nHided: 0,
                        nDescendants: 0,
                        hiddenNodes: [],
                        dependencies: [],
                    }}
                ></VisualizerTree>
            </div>
            <div
                style={{
                    width: '50%',
                    height: '100%',
                    float: 'left',
                    clear: 'none',
                }}
            >
                {nodeInfoTable()}
            </div>
        </div>
    );
};

export default VisualizerDirectoryStyle;
