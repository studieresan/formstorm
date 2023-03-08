import {getFetchErr} from '/js/rendered-react/common.js';

const { useState, useEffect } = React;

const defaultType0 = {
  question_number: 0,
  type: 0,
  mandatory: 0,
  value: {
    question: "",
    small_text: ""
  }
};

const defaultType1 = {
  question_number: 0,
  type: 1,
  mandatory: 0,
  value: {
    question: "",
    alternatives: [""]
  }
};

const defaultType2 = {
  question_number: 0,
  type: 2,
  mandatory: 0,
  value: {
    question: "",
    left: "",
    right: "",
    range: 5
  }
};

Array.prototype.replaceElem = function(index, newElem) {
  return this.map((elem, i) => {
    if (i == index)
      return newElem;
    else
      return elem;
  });
};

Array.prototype.deleteElem = function(index) {
  return this.filter((_, i) => {
    return i !== index;
  });
};

function AddQuestion(props) {
  function onCancel() {
    // maybe not needed
  }

  function onChange(e) {
    let val = e.target.value;
    if (val === "0" || val === "1" || val === "2") {
      props.changeQuestion("add", val);
      e.target.value = "cancel";
    }
  }

  return (
    <select className="edit-add-question" onChange={onChange}>
      <option onClick={onCancel} value="cancel">Add question here...</option>
      <option value="0">Text</option>
      <option value="1">Alternatives</option>
      <option value="2">Range</option>
    </select>
  );
}

function Legend(props) {
  let mandatory = props.question.mandatory === 1;

  function changeMandatory(e) {
    if (e.target.checked) {
      var val = 1;
    } else {
      var val = 0;
    }
    props.changeQuestion("setMandatory", val);
  }

  return (
    <legend>
      Question {props.question.question_number} | Mandatory: 
      <input type="checkbox" defaultChecked={mandatory} onChange={changeMandatory} className="edit-legend-mandatory-checkbox"/>
    </legend>
  )
}

function TextInputFormElem(props) {
  const q = props.question.value;
  const largeText = q.question;
  const smallText = q.small_text;

  function editQuestion(e) {
    props.changeQuestion("edit", {...q, question: e.target.value});
  }

  function editSmallText(e) {
    props.changeQuestion("edit", {...q, small_text: e.target.value});
  }

  return (
    <fieldset>
      <Legend question={props.question} changeQuestion={props.changeQuestion}/>
      <p>Question title:</p>
      <textarea rows="4" value={largeText} onChange={editQuestion} className="edit-text-input-header" />
      <p>Smaller text (optional):</p>
      <textarea rows="4" value={smallText} onChange={editSmallText} className="edit-text-input-small" />
    </fieldset>
  );
}

function RadioBoxElem(props) {
  function changeText(e) {
    props.changeAlternative("edit", e.target.value);
  }

  return (
    <div>
      <input type="radio" disabled id={props.id}/>
      <input type="text" value={props.value} onChange={changeText} className="edit-radio-box-alternative"></input>
      <input type="button" value="❌" onClick={() => props.changeAlternative("delete")}></input>
      <input type="button" value="⇓" onClick={() => props.changeAlternative("moveUp")}></input>
      <input type="button" value="⇑" onClick={() => props.changeAlternative("moveDown")}></input>
    </div>
  );
}

function RadioBoxesFormElem(props) {
  const q = props.question.value;
  const question = q.question;
  const alternatives = q.alternatives;

  function moveUp(i) {
    if (i < alternatives.length - 1) {
      let newAlternatives = [
        ...alternatives.slice(0, i),
        alternatives[i + 1],
        alternatives[i],
        ...alternatives.slice(i + 2)
      ];
      props.changeQuestion("edit", {...q, alternatives: newAlternatives});
    }
  }

  function moveDown(i) {
    if (i > 0) {
      let newAlternatives = [
        ...alternatives.slice(0, i - 1),
        alternatives[i],
        alternatives[i - 1],
        ...alternatives.slice(i + 1)
      ];
      props.changeQuestion("edit", {...q, alternatives: newAlternatives});
    }
  }

  function addAlternative(data, i) {
    let newAlternatives = [
      ...alternatives.slice(0, i + 1),
      "",
      ...alternatives.slice(i + 1)
    ];
    props.changeQuestion("edit", {...q, alternatives: newAlternatives});
  }
  
  function changeAlternative(type, data, i) {
    switch (type) {
      case "delete":
        props.changeQuestion("edit", {...q, alternatives: alternatives.deleteElem(i)});
        break;
      case "add":
        addAlternative(data, i); // add efter index i
        break;
      case "edit":
        props.changeQuestion("edit", {...q, alternatives: alternatives.replaceElem(i, data)});
        break;
      case "moveUp":
        moveUp(i);
        break;
      case "moveDown":
        moveDown(i);
        break;
    }
  }

  function editQuestion(e) {
    props.changeQuestion("edit", {...q, question: e.target.value});
  }

  let radioBoxes = alternatives.map((value, i) => {
    const id = "radio-question-" + props.question.question_number + "-alternative-" + i;
    return (
      <RadioBoxElem key={i} value={value} id={id} changeAlternative={(type, data) => changeAlternative(type, data, i)} />
    );
  });

  return (
    <fieldset>
      <Legend question={props.question} changeQuestion={props.changeQuestion}/>
      <p>Question title:</p>
      <textarea rows="4" value={question} onChange={editQuestion} className="edit-radio-box-header" />
      <br />
      <input type="button" value="➕" onClick={() => changeAlternative("add", null, -1)}></input>
      {radioBoxes}
      <input type="button" value="➕" onClick={() => changeAlternative("add", null, radioBoxes.length - 1)}></input>
    </fieldset>
  );
}

function RangeBoxElem(props) {
  return (
    <div className="flex-mid">
      <label className="range-label" htmlFor={props.id}>{props.value}</label>
      <input disabled className="range-radio" type="radio" id={props.id} value={props.value}/>
    </div>
  );
}

function RangeFormElem(props) {
  const q = props.question.value;
  const question = q.question;
  const alt1 = q.left;
  const alt2 = q.right;
  const num = q.range;

  let radioBoxes = [...Array(parseInt(num)).keys()].map((i) => {
    const id = "radio-question-" + props.question.question_number + "-alternative-" + i;
    return (<RangeBoxElem key={i} value={(i+1).toString()} id={id} />);
  });

  function editQuestion(e) {
    props.changeQuestion("edit", {...q, question: e.target.value});
  }

  function editRange(e) {
    props.changeQuestion("edit", {...q, range: parseInt(e.target.value)});
  }

  function editLeft(e) {
    props.changeQuestion("edit", {...q, left: e.target.value});
  }

  function editRight(e) {
    props.changeQuestion("edit", {...q, right: e.target.value});
  }

  return (
    <fieldset>
      <Legend question={props.question} changeQuestion={props.changeQuestion}/>
      <p>Question title:</p>
      <textarea rows="4" value={question} onChange={editQuestion} className="edit-range-header" />
      <p>Range (between 1 and 10): 
        <input type="number" onChange={editRange} min="1" max="10" value={num} className="edit-range-range"/>
      </p>
      <div className="range-flex">
        <div className="flex-left">
          <p>Left description:</p>
          <input value={alt1} type="text" onChange={editLeft}/>
        </div>
        {radioBoxes}
        <div className="flex-right">
          <p>Right description:</p>
          <input value={alt2} type="text" onChange={editRight}/>
        </div>
      </div>
    </fieldset>
  );
}

export function Form(props) {
  const [questions, setQuestions] = useState([]);
  
  function deleteQuestion(i) {
    let newQuestions = questions.deleteElem(i);
    renumerateAndSet(newQuestions);
  }

  function moveUp(i) {
    if (i < questions.length - 1) {
      let newQuestions = [
        ...questions.slice(0, i),
        questions[i + 1],
        questions[i],
        ...questions.slice(i + 2)
      ];
      renumerateAndSet(newQuestions);
    }
  }

  function moveDown(i) {
    if (i > 0) {
      let newQuestions = [
        ...questions.slice(0, i - 1),
        questions[i],
        questions[i - 1],
        ...questions.slice(i + 1)
      ];
      renumerateAndSet(newQuestions);
    }
  }

  // Add before index i
  function addQuestion(data, i) {
    let elem;
    switch (data) {
      case "0":
        elem = defaultType0; break;
      case "1":
        elem = defaultType1; break;
      case "2":
        elem = defaultType2; break;
    }
    let newQuestions = [
      ...questions.slice(0, i),
      elem,
      ...questions.slice(i)
    ];
    renumerateAndSet(newQuestions);
  }

  function renumerateAndSet(newQuestions) {
    setQuestions(newQuestions.map((elem, index) => {
      return {...elem, question_number: index + 1}
    }));
  }
  
  function changeQuestion(type, data, i) {
    switch (type) {
      case "delete":
        deleteQuestion(i);
        break;
      case "add":
        addQuestion(data, i);
        break;
      case "edit":
        setQuestions(questions.replaceElem(i, {...questions[i], value: data}));
        break;
      case "moveUp":
        moveUp(i);
        break;
      case "moveDown":
        moveDown(i);
        break;
      case "setMandatory":
        setQuestions(questions.replaceElem(i, {...questions[i], mandatory: data}));
        break;
    }
  }

  let formElements = questions.map((question, i) => {
    let q;
    if (question.type === 0) {
      q = (<TextInputFormElem question={question} changeQuestion={(type, data) => changeQuestion(type, data, i)}/>);
    } else if (question.type === 1) {
      q = (<RadioBoxesFormElem question={question} changeQuestion={(type, data) => changeQuestion(type, data, i)}/>);
    } else if (question.type === 2) {
      q = (<RangeFormElem question={question} changeQuestion={(type, data) => changeQuestion(type, data, i)}/>);
    }
    return (
      <div key={i} className="edit-q-container">
        <AddQuestion index={i} changeQuestion={(type, data) => changeQuestion(type, data, i)} />
        <div className="edit-right-buttons">
          <input className="edit-question-up" type="button" value="⇑" onClick={() => changeQuestion("moveDown", null, i)}></input>
          <input className="edit-question-delete" type="button" value="❌" onClick={() => changeQuestion("delete", null, i)}></input>
          <input className="edit-question-down" type="button" value="⇓" onClick={() => changeQuestion("moveUp", null, i)}></input>
        </div>
        {q}
      </div>
    );
  });

  function fetchForm(formTypeId) {
    fetch("/api/form/get-form?form_type_id=" + formTypeId)
      .then(getFetchErr('json'))
      .then((data) => {
        props.formReady(data.formType);
        setQuestions(data.formQuestions);
      })
      .catch((err) => {
        props.displayErr(err);
      });
  }

  useEffect(() => {
    if ("formTypeId" in props && props.formTypeId !== null) {
      fetchForm(props.formTypeId);
    }
  }, [props.formTypeId]);

  let cancelSave = (
    <div class="edit-cancel-save">
      <input type="button" value="Save" onClick={() => props.submitNewForm(questions)}/>
      <a href='/'><input type="button" value="Cancel" /></a>
    </div>
  );

  return (
    <form>
      {cancelSave}
      {formElements}
      <AddQuestion index={formElements.length} changeQuestion={(type, data) => changeQuestion(type, data, formElements.length)} />
      <br/><br/>
      {cancelSave}
    </form>
  );
}
