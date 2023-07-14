import { useRef, useEffect, useState } from 'react'
import * as tt from '@tomtom-international/web-sdk-maps'
import * as ttapi from '@tomtom-international/web-sdk-services'
import '@tomtom-international/web-sdk-maps/dist/maps.css'
import './App.css'
import "bootstrap/dist/css/bootstrap.min.css";
import {  Container,
  Row,
  Col,
  Button,
  FormGroup,
  Label,
  Input,
  Navbar,
  NavbarBrand
} from "reactstrap";

const App = () => {
  const mapElement = useRef()
  const [map, setMap] = useState({})
  const [longitude, setLongitude] = useState(120.598564)
  const [latitude, setLatitude] = useState(16.41639)

  const convertToPoints = (lngLat) => {
    return {
      point: {
        latitude: lngLat.lat,
        longitude: lngLat.lng
      }
    }
  }

  const drawRoute = (geoJson, map) => {
    if (map.getLayer('route')) {
      map.removeLayer('route')
      map.removeSource('route')
    }
    map.addLayer({
      id: 'route',
      type: 'line',
      source: {
        type: 'geojson',
        data: geoJson
      },
      paint: {
        'line-color': 'red',
        'line-width': 6
      }
    })
  }

  const addDestinationMarker = (lngLat, map) => {
    const element = document.createElement('div')
    element.className = 'marker-destination'
  
    const marker = new tt.Marker({
      element: element
    })
      .setLngLat(lngLat)
      .addTo(map)
  }
  


  


  useEffect(() => {
    const origin = {
      lng: longitude,
      lat: latitude,
    }

    const destinations = []

    let map = tt.map({
      key: process.env.REACT_APP_TRAVEL_ITINERARY_API_KEY,
      container: mapElement.current,
      stylesVisibility: {
        trafficIncidents: true,
        trafficFlow: true
      },
      center: [longitude, latitude],
      zoom: 12,
    })

    setMap(map)

    const addMarker = () => {

      const popupOffset = {
        bottom: [0, -25]
      }
      const popup = new tt.Popup({ offset: popupOffset }).setHTML('This is your starting point.')

      const element = document.createElement('div')
      
      element.className = 'marker'

      const marker = new tt.Marker({
        draggable: true,
        element: element,
      })
        .setLngLat([longitude, latitude])
        .addTo(map)

      marker.on('dragend', () => {
        const lngLat = marker.getLngLat()
        setLongitude(lngLat.lng)
        setLatitude(lngLat.lat)
      })

      marker.setPopup(popup).togglePopup()
    }

    addMarker()

    const sortDestinations = (locations) => {

      const pointsForDestinations = locations.map((destination) => {
        return convertToPoints(destination)
      })

      const callParameters = {
        key: process.env.REACT_APP_TRAVEL_ITINERARY_API_KEY,
        destinations: pointsForDestinations,
        origins: [convertToPoints(origin)],
      }

      return new Promise((resolve, reject) => {
        ttapi.services
          .matrixRouting(callParameters)
        .then((matrixAPIResults) => {
          const results = matrixAPIResults.matrix[0]
          const resultsArray = results.map((result, index) => {
            return{
              location: locations[index],
              drivingtime: result.response.routeSummary.travelTimeInSeconds,
            }
          })
          resultsArray.sort((a,b) => {
            return a.drivingtime - b.drivingtime
          })
          const sortedLocations = resultsArray.map((result) => {
            return result.location
          })
          resolve(sortedLocations)
        })
      })
    }


    const recalculateRoutes = () => {
      sortDestinations(destinations).then((sorted) => {
        sorted.unshift(origin)

        ttapi.services
          .calculateRoute({
            key: process.env.REACT_APP_TRAVEL_ITINERARY_API_KEY,
            locations: sorted,
          })
          .then((routeData) => {
            const geoJson = routeData.toGeoJson()
            drawRoute(geoJson, map)
          })
      })
    }


    map.on('click', (e) => {
      destinations.push(e.lngLat)
      addDestinationMarker(e.lngLat, map)
      recalculateRoutes()
    })

    
    return () => map.remove()
  }, [longitude, latitude])


  return (
    <>
    {map && (
        <div className="app">
          <Navbar dark={true} style={{ backgroundColor: "#c2a042" }}>
            <NavbarBrand>
              <img alt = "logo" src = "https://cdn.icon-icons.com/icons2/547/PNG/512/1455554373_line-43_icon-icons.com_53307.png"
              style = {{height: 35, width: 35}}/>
              Travel Itinerary Application</NavbarBrand></Navbar>
          <Container className ="mapContainer">
            <Row>
              <Col xs = "4">
                <h1 className = "thisRow">Baguio Trip Itinerary!</h1>
                <p className = "thisRow"> Choose a location by putting the latitude and longitude or pinpoint it using the map beside!</p>
                <FormGroup className = "thisRow"> 
                <Label for = "latitude">Latitude: </Label>
                  <Input
                    type="text"
                    id="latitude"
                    className="latitude"
                    placeholder="Put in latitude"
                    onChange={(e) => {
                      setLatitude(e.target.value)
                    }}
                  />
                </FormGroup>
                <FormGroup className = "thisRow">
                  <Label for = "longitude">Longitude: </Label>
                  <Input
                  type="text"
                  id="longitude"
                  className="longitude"
                  placeholder="Put in Longitude"
                  onChange={(e) => {
                    setLongitude(e.target.value)
                  }}
                />
                </FormGroup>  
            <FormGroup className = "thisRow"> 
                <Label for = "NoDays">Number of Days: </Label>
                  <Input
                    type="text"
                    id="nodays"
                    className="nodays"
                    placeholder="How many days are you going to travel?"
                  />
            </FormGroup>
            <FormGroup className = "thisRow"> 
                <Label for = "Budget">Budget: </Label>
                  <Input
                    type="text"
                    id="budget"
                    className="budget"
                    placeholder="How much is your budget for this trip?"
                  />
            </FormGroup>
            <Col>
            <Row>
              <Button color = "primary">
                Click to find the best itineraries
              </Button>
            </Row>
            </Col>  
            </Col>
            <Col>
            <div ref={mapElement} className="map"  />
            </Col>
            </Row>
          </Container>
        </div>
    )}
    </>

  )

  }

export default App
