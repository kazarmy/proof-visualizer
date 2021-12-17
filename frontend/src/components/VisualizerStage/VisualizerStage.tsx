/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';

import { Drawer, Position, Classes, Icon, Collapse, Pre, TreeNodeInfo } from '@blueprintjs/core';
import Canvas from './Canvas/VisualizerCanvas';
import VisualizerTree from '../VisualizerTree/VisualizerTree';
import VisualizerDirectoryStyle from './VisualizerDirectoryStyle/VisualizerDirectoryStyle';
import { processDot } from '../../store/features/proof/auxi';

import '../../scss/VisualizerStage.scss';
import { useAppSelector } from '../../store/hooks';
import { selectDot, selectFileCount } from '../../store/features/file/fileSlice';
import { selectStyle } from '../../store/features/proof/proofSlice';
import { selectTheme } from '../../store/features/theme/themeSlice';
import { NodeInfo, NodeInterface, TreeNode } from '../../interfaces/interfaces';

function ruleHelper(rule: string) {
    switch (rule.split(' ')[0]) {
        case 'π':
            return 'This node hides some parts of the proof, you can unfold it.';
        case 'ASSUME':
            return (
                rule +
                '\n\n======== Assumption (a leaf)\nChildren: none\nArguments: (F)\n--------------\nConclusion: F\n\nThis rule has special status, in that an application of assume is an open leaf in a proof that is not (yet) justified. An assume leaf is analogous to a free variable in a term, where we say "F is a free assumption in proof P" if it contains an application of F that is not  bound by SCOPE.'
            );
        case 'SCOPE':
            return (
                rule +
                '\n\n======== Scope (a binder for assumptions)\nChildren: (P:F)\nArguments: (F1, ..., Fn)\n--------------\nConclusion: (=> (and F1 ... Fn) F) or (not (and F1 ... Fn)) if F is false\n\nThis rule has a dual purpose with ASSUME. It is a way to close assumptions in a proof. We require that F1 ... Fn are free assumptions in P and say that F1, ..., Fn are not free in (SCOPE P). In other words, they are bound by this application. For example, the proof node: (SCOPE (ASSUME F) :args F) has the conclusion (=> F F) and has no free assumptions. More generally, a proof with no free assumptions always concludes a valid formula.'
            );
        case 'SUBS':
            return (
                rule +
                '\n\n======== Substitution\nChildren: (P1:F1, ..., Pn:Fn)\nArguments: (t, (ids)?)\n---------------------------------------------------------------\nConclusion: (= t t*sigma{ids}(Fn)*...*sigma{ids}(F1))\nwhere sigma{ids}(Fi) are substitutions, which notice are applied in reverse order. Notice that ids is a MethodId identifier, which determines how to convert the formulas F1, ..., Fn into substitutions.'
            );
        case 'REWRITE':
            return (
                rule +
                '\n\n======== Rewrite\nChildren: none\nArguments: (t, (idr)?)\n----------------------------------------\nConclusion: (= t Rewriter{idr}(t))\nwhere idr is a MethodId identifier, which determines the kind of rewriter to apply, e.g. Rewriter::rewrite.'
            );
        case 'EVALUATE':
            return (
                rule +
                '\n\n======== Evaluate\nChildren: none\n\nArguments: (t)\n----------------------------------------\nConclusion: (= t Evaluator::evaluate(t))\nNote this is equivalent to: (REWRITE t MethodId::RW_EVALUATE)'
            );
        case 'MACRO_SR_EQ_INTRO':
            return (
                rule +
                "\n\nIn this rule, we provide a term t and conclude that it is equal to its rewritten form under a (proven) substitution.\n\nChildren: (P1:F1, ..., Pn:Fn)\nArguments: (t, (ids (ida (idr)?)?)?)\n---------------------------------------------------------------\nConclusion: (= t t')\nwhere t' is Rewriter{idr}(t*sigma{ids, ida}(Fn)*...*sigma{ids, ida}(F1))\n\nIn other words, from the point of view of Skolem forms, this rule transforms t to t' by standard substitution + rewriting.\n\nThe arguments ids, ida and idr are optional and specify the identifier of the substitution, the substitution application and rewriter respectively to be used."
            );
        case 'MACRO_SR_PRED_INTRO':
            return (
                rule +
                "\n\nIn this rule, we provide a formula F and conclude it, under the condition that it rewrites to true under a proven substitution.\n\nChildren: (P1:F1, ..., Pn:Fn)\nArguments: (F, (ids (ida (idr)?)?)?)\n---------------------------------------------------------------\nConclusion: F\nwhere Rewriter{idr}(F*sigma{ids, ida}(Fn)*...*sigma{ids, ida}(F1)) == true where ids and idr are method identifiers.\n\nMore generally, this rule also holds when: Rewriter::rewrite(toOriginal(F')) == true where F' is the result of the left hand side of the equality above. Here, notice that we apply rewriting on the original form of F', meaning that this rule may conclude an F whose Skolem form is justified by the definition of its (fresh) Skolem variables. For example, this rule may justify the conclusion (= k t) where k is the purification Skolem for t, e.g. where the original form of k is t.\n\nFurthermore, notice that the rewriting and substitution is applied only within the side condition, meaning the rewritten form of the original form of F does not escape this rule."
            );
        case 'MACRO_SR_PRED_ELIM':
            return (
                rule +
                "\n\nIn this rule, if we have proven a formula F, then we may conclude its rewritten form under a proven substitution.\n\nChildren: (P1:F, P2:F1, ..., P_{n+1}:Fn)\nArguments: ((ids (ida (idr)?)?)?)\n----------------------------------------\nConclusion: F'\nwhere F' is Rewriter{idr}(F*sigma{ids, ida}(Fn)*...*sigma{ids, ida}(F1)). where ids and idr are method identifiers.\n\nWe rewrite only on the Skolem form of F, similar to MACRO_SR_EQ_INTRO."
            );
        case 'MACRO_SR_PRED_TRANSFORM':
            return (
                rule +
                "\n\nIn this rule, if we have proven a formula F, then we may provide a formula G and conclude it if F and G are equivalent after rewriting under a proven substitution.\n\nChildren: (P1:F, P2:F1, ..., P_{n+1}:Fn)\nArguments: (G, (ids (ida (idr)?)?)?)\n----------------------------------------\nConclusion: G\nwhere Rewriter{idr}(F*sigma{ids, ida}(Fn)*...*sigma{ids, ida}(F1)) == Rewriter{idr}(G*sigma{ids, ida}(Fn)*...*sigma{ids, ida}(F1))\n\nMore generally, this rule also holds when:\n  Rewriter::rewrite(toOriginal(F')) == Rewriter::rewrite(toOriginal(G'))\nwhere F' and G' are the result of each side of the equation above. Here, original forms are used in a similar manner to MACRO_SR_PRED_INTRO above."
            );
        case 'REMOVE_TERM_FORMULA_AXIOM':
            return (
                rule +
                '\n\n======== Remove Term Formulas Axiom\nChildren: none\nArguments: (t)\n---------------------------------------------------------------\nConclusion: RemoveTermFormulas::getAxiomFor(t).'
            );
        case 'THEORY_LEMMA':
            return (
                rule +
                '\n\n======== Theory lemma\nChildren: none\nArguments: (F, tid)\n---------------------------------------------------------------\nConclusion: F\nwhere F is a (T-valid) theory lemma generated by theory with TheoryId tid. This is a "coarse-grained" rule that is used as a placeholder if a theory did not provide a proof for a lemma or conflict.'
            );
        case 'THEORY_REWRITE':
            return (
                rule +
                "\n\n======== Theory Rewrite\nChildren: none\nArguments: (F, tid, rid)\n----------------------------------------\nConclusion: F\nwhere F is an equality of the form (= t t') where t' is obtained by applying the kind of rewriting given by the method identifier rid, which is one of: { RW_REWRITE_THEORY_PRE, RW_REWRITE_THEORY_POST, RW_REWRITE_EQ_EXT } Notice that the checker for this rule does not replay the rewrite to ensure correctness, since theory rewriter methods are not static. For example, the quantifiers rewriter involves constructing new bound variables that are not guaranteed to be consistent on each call."
            );
        case 'PREPROCESS':
            return (
                rule +
                "\n\nArguments: (F)\n---------------------------------------------------------------\nConclusion: F\nwhere F is an equality of the form t = t' where t was replaced by t' based on some preprocessing pass, or otherwise F was added as a new assertion by some preprocessing pass."
            );
        case 'PREPROCESS_LEMMA':
            return (
                rule +
                '\n\nArguments: (F)\n---------------------------------------------------------------\nConclusion: F\nwhere F was added as a new assertion by some preprocessing pass.'
            );
        case 'THEORY_PREPROCESS':
            return (
                rule +
                '\n\nArguments: (F)\n---------------------------------------------------------------\nConclusion: F\nwhere F is an equality of the form t = Theory::ppRewrite(t) for some theory. Notice this is a "trusted" rule.'
            );
        case 'THEORY_PREPROCESS_LEMMA':
            return (
                rule +
                '\n\nArguments: (F)\n---------------------------------------------------------------\nConclusion: F\nwhere F was added as a new assertion by theory preprocessing.'
            );
        case 'THEORY_EXPAND_DEF':
            return (
                rule +
                "\n\nArguments: (F)\n---------------------------------------------------------------\nConclusion: F\nwhere F is an equality of the form t = t' where t was replaced by t' based on theory expand definitions."
            );
        case 'WITNESS_AXIOM':
            return (
                rule +
                '\n\nArguments: (F)\n---------------------------------------------------------------\nConclusion: F\nwhere F is an existential (exists ((x T)) (P x)) used for introducing a witness term (witness ((x T)) (P x)).'
            );
        case 'TRUST_REWRITE':
            return (
                rule +
                "\n\nArguments: (F)\n---------------------------------------------------------------\nConclusion: F\nwhere F is an equality (= t t') that holds by a form of rewriting that could not be replayed during proof postprocessing."
            );
        case 'TRUST_SUBS':
            return (
                rule +
                "\n\nArguments: (F)\n---------------------------------------------------------------\nConclusion: F\nwhere F is an equality (= t t') that holds by a form of substitution that could not be replayed during proof postprocessing."
            );
        case 'TRUST_SUBS_MAP':
            return (
                rule +
                "\n\nArguments: (F)\n---------------------------------------------------------------\nConclusion: F\nwhere F is an equality (= t t') that holds by a form of substitution that could not be determined by the TrustSubstitutionMap. This inference may contain possibly multiple children corresponding to the formulas used to derive the substitution."
            );
        case 'TRUST_SUBS_EQ':
            return (
                rule +
                "\n\nArguments: (F)\n---------------------------------------------------------------\nConclusion: F\nwhere F is a solved equality of the form (= x t) derived as the solved form of F', where F' is given as a child."
            );
        case 'SAT_REFUTATION':
            return (
                rule +
                '\n\n========= SAT Refutation for assumption-based unsat cores\nChildren: (P1, ..., Pn)\nArguments: none\n---------------------\nConclusion: false\nNote: P1, ..., Pn correspond to the unsat core determined by the SAT solver.'
            );
        case 'RESOLUTION':
            return (
                rule +
                "\n\n======== Resolution\nChildren:\n(P1:C1, P2:C2)\nArguments: (pol, L)\n---------------------\nConclusion: C\nwhere\n- C1 and C2 are nodes viewed as clauses, i.e., either an OR node with each children viewed as a literal or a node viewed as a literal. Note that an OR node could also be a literal.\n- pol is either true or false, representing the polarity of the pivot on the first clause\n- L is the pivot of the resolution, which occurs as is (resp. under a NOT) in C1 and negatively (as is) in C2 if pol = true (pol = false).\nC is a clause resulting from collecting all the literals in C1, minus the first occurrence of the pivot or its negation, and C2, minus the first occurrence of the pivot or its negation, according to the policy above. If the resulting clause has a single literal, that literal itself is the result; if it has no literals, then the result is false; otherwise it's an OR node of the resulting literals.\n\nNote that it may be the case that the pivot does not occur in the clauses. In this case the rule is not unsound, but it does not correspond to resolution but rather to a weakening of the clause that did not have a literal eliminated."
            );
        case 'CHAIN_RESOLUTION':
            return (
                rule +
                "\n\n======== N-ary Resolution\nChildren: (P1:C_1, ..., Pm:C_n)\nArguments: (pol_1, L_1, ..., pol_{n-1}, L_{n-1})\n---------------------\nConclusion: C\nwhere\n- let C_1 ... C_n be nodes viewed as clauses, as defined above\n- let \"C_1 <>_{L,pol} C_2\" represent the resolution of C_1 with C_2 with pivot L and polarity pol, as defined above\n- let C_1' = C_1 (from P1),\n- for each i > 1, let C_i' = C_{i-1} <>_{L_{i-1}, pol_{i-1}} C_i'\nThe result of the chain resolution is C = C_n'"
            );
        case 'FACTORING':
            return (
                rule +
                '\n\n======== Factoring\nChildren: (P:C1)\nArguments: ()\n---------------------\nConclusion: C2\nwhere Set representations of C1 and C2 is the same and the number of literals in C2 is smaller than that of C1'
            );
        case 'REORDERING':
            return (
                rule +
                '\n\n======== Reordering\nChildren: (P:C1)\nArguments: (C2)\n---------------------\nConclusion: C2\nwhere Set representations of C1 and C2 are the same and the number of literals in C2 is the same of that of C1'
            );
        case 'MACRO_RESOLUTION':
            return (
                rule +
                "\n\n======== N-ary Resolution + Factoring + Reordering\nChildren: (P1:C_1, ..., Pm:C_n)\nArguments: (C, pol_1, L_1, ..., pol_{n-1}, L_{n-1})\n---------------------\nConclusion: C\nwhere\n- let C_1 ... C_n be nodes viewed as clauses, as defined in RESOLUTION\n- let \"C_1 <>_{L,pol} C_2\" represent the resolution of C_1 with C_2 with pivot L and polarity pol, as defined in RESOLUTION\n- let C_1' be equal, in its set representation, to C_1 (from P1),\n- for each i > 1, let C_i' be equal, it its set representation, to C_{i-1} <>_{L_{i-1}, pol_{i-1}} C_i'\nThe result of the chain resolution is C, which is equal, in its set representation, to C_n'"
            );
        case 'MACRO_RESOLUTION_TRUST':
            return (
                rule +
                "\n\nAs MACRO_RESOLUTION but not checked\n\nMACRO_RESOLUTION definition:\n======== N-ary Resolution + Factoring + Reordering\nChildren: (P1:C_1, ..., Pm:C_n)\nArguments: (C, pol_1, L_1, ..., pol_{n-1}, L_{n-1})\n---------------------\nConclusion: C\nwhere\n- let C_1 ... C_n be nodes viewed as clauses, as defined in RESOLUTION\n- let \"C_1 <>_{L,pol} C_2\" represent the resolution of C_1 with C_2 with pivot L and polarity pol, as defined in RESOLUTION\n- let C_1' be equal, in its set representation, to C_1 (from P1),\n- for each i > 1, let C_i' be equal, it its set representation, to C_{i-1} <>_{L_{i-1}, pol_{i-1}} C_i'\nThe result of the chain resolution is C, which is equal, in its set representation, to C_n'"
            );
        default:
            return rule;
    }
}

const createTree = (proof: NodeInterface[]): any => {
    const list: TreeNode[] = proof.map((node) => {
        const label = node.hiddenNodes?.length
            ? `${node.id} : π ➜ ${node.conclusion}`
            : `${node.id} : ${node.conclusion}`;
        return {
            id: node.id,
            icon: 'graph',
            label: label,
            secondaryLabel: `${node.rule}`,
            rule: node.rule,
            args: node.args,
            conclusion: node.conclusion,
            parentId: node.parents[0],
            descendants: node.descendants - 1,
            nHided: node.hiddenNodes ? node.hiddenNodes.length : 0,
            hiddenNodes: node.hiddenNodes ? node.hiddenNodes.map((node) => node.id) : [],
            childNodes: [],
            parentsId: node.parents,
            hasCaret: Boolean(node.descendants - 1),
        };
    });

    const map: any = {},
        roots: any = [];
    let node: TreeNode, i;

    // Map the { [node id]: list array id }
    for (i = 0; i < list.length; i += 1) {
        map[list[i].id] = i;
    }

    for (i = 0; i < list.length; i += 1) {
        node = list[i];
        // For all the parents
        node.parentsId.forEach((parentId) => {
            // If the parent is valid and exist in the list
            if (!isNaN(parentId) && list[map[parentId]]) {
                list[map[parentId]].childNodes.push(node);
            } else {
                roots.push(node);
            }
        });
    }
    return roots;
};

const indent = (s: string) => {
    let newS = s.replaceAll(' ', '\n');
    let i = 0;
    let pCounter = 0;
    while (i < newS.length) {
        if (newS[i] === '(' || newS[i] === '[') pCounter++;
        else if (newS[i] === ')' || newS[i] === ']') pCounter--;
        else if (newS[i] === '\n') {
            if (newS[i + 1] === ')' || newS[i + 1] === ']') {
                newS = [newS.slice(0, i + 1), '  '.repeat(pCounter - 1), newS.slice(i + 1)].join('');
                i += pCounter - 1;
            } else {
                newS = [newS.slice(0, i + 1), '  '.repeat(pCounter), newS.slice(i + 1)].join('');
                i += pCounter;
            }
        }
        i++;
    }
    return newS;
};

const VisualizerStage: React.FC = () => {
    const dot = useAppSelector(selectDot);
    const fileID = useAppSelector(selectFileCount);
    const style = useAppSelector(selectStyle);
    const darkTheme = useAppSelector(selectTheme);
    const [[proof, letMap], setProofAndLet] = useState<[NodeInterface[], any]>([[], '']);
    const [proofTree, setProofTree] = useState([]);
    // Make sure that a new tree and proof is created only when a new dot is used
    useEffect(() => {
        const [newProof, newLetMap] = processDot(dot ? dot : '');
        setProofAndLet([newProof, newLetMap]);
        setProofTree(createTree(newProof));
    }, [dot]);
    const [drawerIsOpen, setDrawerIsOpen] = useState(false);
    const [ruleHelperOpen, setRuleHelperOpen] = useState(false);
    const [argsTranslatorOpen, setArgsTranslatorOpen] = useState(false);
    const [conclusionTranslatorOpen, setConclusionTranslatorOpen] = useState(false);
    const [nodeInfo, setNodeInfo] = useState<NodeInfo>({
        rule: '',
        args: '',
        conclusion: '',
        nHided: 0,
        nDescendants: 0,
        hiddenNodes: [],
    });
    const [nodeInfoCopy, setNodeInfoCopy] = useState<NodeInfo>({
        rule: '',
        args: '',
        conclusion: '',
        nHided: 0,
        nDescendants: 0,
        hiddenNodes: [],
    });
    // TODO: Fazer a chamada do createTree aq dentro pra usar nso drawers, em vez de fazer dentro do canvas
    const [tree, setTree] = useState<TreeNodeInfo[]>([]);
    const translate = (s: string) => {
        let newS = s;
        let i = newS.indexOf('let');
        while (i !== -1) {
            const l = newS.slice(i).split(/[ |)|,]/)[0];
            newS = newS.replace(l, letMap[l]);
            i = newS.indexOf('let');
        }
        return newS;
    };

    const openDrawer = (nodeInfo: NodeInfo, tree?: TreeNodeInfo[]) => {
        setRuleHelperOpen(false);
        setNodeInfo(nodeInfo);
        setTree(tree ? tree : []);
        setNodeInfoCopy(nodeInfo);
        setDrawerIsOpen(true);
    };

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
                                id="rule-icon"
                                icon="help"
                                onClick={() => {
                                    setArgsTranslatorOpen(false);
                                    setConclusionTranslatorOpen(false);
                                    setRuleHelperOpen(!ruleHelperOpen);
                                }}
                            ></Icon>
                        </td>
                        <td>
                            {nodeInfo.rule}
                            <Collapse isOpen={ruleHelperOpen}>
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
                                        id="rule-icon"
                                        icon="translate"
                                        onClick={() => {
                                            setConclusionTranslatorOpen(false);
                                            setRuleHelperOpen(false);
                                            setArgsTranslatorOpen(!argsTranslatorOpen);
                                        }}
                                    ></Icon>
                                ) : null}
                            </td>
                            <td style={{ maxHeight: '300px', overflow: 'auto' }}>
                                {nodeInfo.args}
                                {nodeInfo.args.indexOf('let') !== -1 ? (
                                    <Collapse isOpen={argsTranslatorOpen}>
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
                                    id="rule-icon"
                                    icon="translate"
                                    onClick={() => {
                                        setArgsTranslatorOpen(false);
                                        setRuleHelperOpen(false);
                                        setConclusionTranslatorOpen(!conclusionTranslatorOpen);
                                    }}
                                ></Icon>
                            ) : null}
                        </td>
                        <td style={{ maxHeight: '300px', overflow: 'auto' }}>
                            {nodeInfo.conclusion}
                            {nodeInfo.conclusion.indexOf('let') !== -1 ? (
                                <Collapse isOpen={conclusionTranslatorOpen}>
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
                </tbody>
            </table>
        );
    };

    return (
        <div onContextMenu={(e) => e.preventDefault()}>
            {proof.length > 1 ? (
                style === 'graph' ? (
                    <Canvas key={fileID} openDrawer={openDrawer}></Canvas>
                ) : (
                    <VisualizerDirectoryStyle
                        proofTree={proofTree}
                        ruleHelper={ruleHelper}
                        indent={indent}
                        translate={translate}
                    />
                )
            ) : null}
            <Drawer
                className={darkTheme ? 'bp3-dark' : ''}
                autoFocus={true}
                canEscapeKeyClose={true}
                canOutsideClickClose={true}
                enforceFocus={true}
                hasBackdrop={false}
                isOpen={drawerIsOpen}
                position={Position.BOTTOM}
                usePortal={true}
                onClose={(e) => {
                    e.preventDefault();
                    setDrawerIsOpen(false);
                    setArgsTranslatorOpen(false);
                    setConclusionTranslatorOpen(false);
                }}
                icon="info-sign"
                title="Node info"
            >
                <div className={Classes.DRAWER_BODY}>
                    <VisualizerTree
                        darkTheme={darkTheme}
                        content={tree}
                        setNodeInfo={setNodeInfo}
                        originalNodeInfo={nodeInfoCopy}
                    ></VisualizerTree>
                    <div className={Classes.DIALOG_BODY}>{nodeInfoTable()}</div>
                </div>
            </Drawer>
        </div>
    );
};

export default VisualizerStage;
