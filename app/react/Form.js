import { getFetchErr } from "/js/rendered-react/common.js";

import { useState, useEffect } from "react";

Array.prototype.replaceElem = function (index, newElem) {
  return this.map((elem, i) => {
    if (i == index) return newElem;
    else return elem;
  });
};

function Legend(props) {
  let mandatory =
    props.question.mandatory === 1 ? (
      <span className="mandatory-span">*</span>
    ) : (
      ""
    );

  return (
    <legend>
      Question {props.question.question_number} {mandatory}
    </legend>
  );
}

function TextInputFormElem(props) {
  const q = props.question.value;
  const largeText = q.question;
  const smallText = q.small_text;

  return (
    <fieldset>
      <Legend question={props.question} />
      <p>{largeText}</p>
      <p style={{ fontSize: "13px" }}>{smallText}</p>
      <textarea
        value={props.answer}
        onChange={props.onFieldChange}
        rows="4"
      ></textarea>
    </fieldset>
  );
}

function RadioBoxElem(props) {
  return (
    <div>
      <input
        type="radio"
        id={props.id}
        value={props.value}
        onChange={props.onFieldChange}
        checked={props.value === props.answer}
      />
      <label htmlFor={props.id}>{props.value}</label>
    </div>
  );
}

function RadioBoxesFormElem(props) {
  const q = props.question.value;
  const question = q.question;
  const alternatives = q.alternatives;

  let radioBoxes = alternatives.map((value, i) => {
    const id =
      "radio-question-" + props.question.question_number + "-alternative-" + i;
    return (
      <RadioBoxElem
        key={i}
        value={value}
        answer={props.answer}
        onFieldChange={props.onFieldChange}
        id={id}
      />
    );
  });

  return (
    <fieldset>
      <Legend question={props.question} />
      <p>{question}</p>
      {radioBoxes}
    </fieldset>
  );
}

function RangeBoxElem(props) {
  return (
    <div className="flex-mid">
      <label className="range-label" htmlFor={props.id}>
        {props.value}
      </label>
      <input
        className="range-radio"
        type="radio"
        id={props.id}
        value={props.value}
        onChange={props.onFieldChange}
        checked={props.value === props.answer}
      />
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
    const id =
      "radio-question-" + props.question.question_number + "-alternative-" + i;
    return (
      <RangeBoxElem
        key={i}
        value={(i + 1).toString()}
        answer={props.answer}
        onFieldChange={props.onFieldChange}
        id={id}
      />
    );
  });

  return (
    <fieldset>
      <Legend question={props.question} />
      <p>{question}</p>
      <div className="range-flex">
        <div className="flex-left">
          <p>{alt1}</p>
        </div>
        {radioBoxes}
        <div className="flex-right">
          <p>{alt2}</p>
        </div>
      </div>
    </fieldset>
  );
}

export function Form(props) {
  const [questions, setQuestions] = useState([]);

  let formElements = questions.map((question, i) => {
    if (question.type === 0) {
      return (
        <TextInputFormElem
          key={i}
          question={question}
          answer={props.answers[i]}
          onFieldChange={(e) => props.handleFieldChange(i, e.target.value)}
        />
      );
    } else if (question.type === 1) {
      return (
        <RadioBoxesFormElem
          key={i}
          question={question}
          answer={props.answers[i]}
          onFieldChange={(e) => props.handleFieldChange(i, e.target.value)}
        />
      );
    } else if (question.type === 2) {
      return (
        <RangeFormElem
          key={i}
          question={question}
          answer={props.answers[i]}
          onFieldChange={(e) => props.handleFieldChange(i, e.target.value)}
        />
      );
    }
  });

  function fetchForm(formTypeId) {
    fetch("/api/form/get-form?form_type_id=" + formTypeId)
      .then(getFetchErr("json"))
      .then((data) => {
        props.formReady(
          data.formQuestions.map((elem) => ""),
          data.formType
        );
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

  return <form>{formElements}</form>;
}
