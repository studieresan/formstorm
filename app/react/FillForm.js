import { Form } from "/js/rendered-react/Form.js";
import { getFetchErr } from "/js/rendered-react/common.js";

import { useState, useEffect } from "react";

function TopInfo(props) {
  let prepost = props.formType.prepost === 0 ? "Pre" : "Post";

  return (
    <div>
      <h2 className="center">{prepost} Event Form</h2>
      <h1 className="center">{props.event.company_name}</h1>
      <p className="center">{props.userData.real_name}</p>
    </div>
  );
}

function ErrorMessage(props) {
  let warn = props.msg === "" ? "" : " ⚠ ";

  return (
    <div>
      <p>
        <span className="warning-sign">{warn}</span>
        <span className="warning-text">{props.msg}</span>
      </p>
    </div>
  );
}

function SubmitSuccess(props) {
  return (
    <div>
      <br />
      <br />
      <h2 className="center">Form submitted! 🎉</h2>
    </div>
  );
}

function AlreadySubmitted(props) {
  return (
    <div>
      <br />
      <br />
      <h4 className="center">You have already answered this form!</h4>
    </div>
  );
}

function SendButton(props) {
  function handleOnlick(e) {
    e.preventDefault();
    props.sendFunc();
    return false;
  }

  return <button onClick={handleOnlick}>Submit</button>;
}

export function FormWrapperFill(props) {
  const [state, setState] = useState({
    formTypeId: null,
    answers: [],
    formType: {},
    userData: {},
    event: {},
    errMsg: "",
    state: 0,
    // 0 == waiting for fetchUserData
    // 1 == start receive form
    // 2 == form received
    // 3 == form sent successfully
    // 4 == has already answered
  });

  function fetchUserData(internal_id, prepost) {
    fetch(
      `/api/form/get-user-data?internal_id=${internal_id}&prepost=${prepost}`
    )
      .then(getFetchErr("json"))
      .then((data) => {
        if (prepost === "0") var formTypeId = data.event.pre_form;
        else var formTypeId = data.event.post_form;

        if (data.hasSubmitted) var newState = 4;
        else var newState = 1;

        setState({
          ...state,
          formTypeId: formTypeId,
          userData: data.userData,
          event: data.event,
          state: newState,
        });
      })
      .catch((err) => {
        displayErr(err);
      });
  }

  function submitAnswers() {
    fetch("/api/form/submit-form", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        answers: state.answers,
        internal_id: props.internal_id,
        prepost: props.prepost,
      }),
    })
      .then(getFetchErr("text"))
      .then((data) => {
        setState({
          ...state,
          state: 3,
          errMsg: "",
        });
      })
      .catch((err) => {
        displayErr(err);
      });
  }

  useEffect(() => {
    if ("internal_id" in props && "prepost" in props) {
      fetchUserData(props.internal_id, props.prepost);
    }
  }, []);

  function handleFieldChange(index, value) {
    setState({
      ...state,
      answers: state.answers.replaceElem(index, value),
    });
  }

  function displayErr(s) {
    setState({
      ...state,
      errMsg: String(s),
    });
    window.scrollTo(0, 0);
  }

  function formReady(answers, formType) {
    setState({
      ...state,
      answers: answers,
      formType: formType,
      state: 2,
    });
  }

  let sendButton =
    state.state === 2 ? (
      <SendButton
        answers={state.answers}
        internal_id={props.internal_id}
        prepost={props.prepost}
        sendFunc={submitAnswers}
      />
    ) : (
      ""
    );

  let form =
    state.state === 1 || state.state === 2 ? (
      <Form
        answers={state.answers}
        handleFieldChange={handleFieldChange}
        formTypeId={state.formTypeId}
        formReady={formReady}
        displayErr={displayErr}
      />
    ) : (
      ""
    );

  let submitSuccess = state.state === 3 ? <SubmitSuccess /> : "";

  let alreadySubmitted = state.state === 4 ? <AlreadySubmitted /> : "";

  return (
    <div>
      <TopInfo
        formType={state.formType}
        userData={state.userData}
        event={state.event}
      />
      <ErrorMessage msg={state.errMsg} />
      {form}
      {submitSuccess}
      {alreadySubmitted}
      {sendButton}
    </div>
  );
}
